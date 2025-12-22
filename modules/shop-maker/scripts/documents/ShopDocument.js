/**
 * ShopDocument - Data model for a shop
 */

import { SHOP_MAKER } from "../constants.js";

export class ShopDocument {
  constructor(data = {}) {
    this.id = data.id || foundry.utils.randomID();
    this.name = data.name || "New Shop";
    this.description = data.description || "";
    this.image = data.image || "icons/svg/hanging-sign.svg";
    this.owner = data.owner || game.user.id;
    this.isOpen = data.isOpen ?? true;
    
    // Shop configuration
    this.config = {
      // Which item types this shop carries
      itemTypes: data.config?.itemTypes || [],
      // Rarity configuration per item type
      rarityConfig: data.config?.rarityConfig || this._getDefaultRarityConfig(),
      // Price modifier (1.0 = normal, 1.5 = 50% markup, 0.8 = 20% discount)
      priceModifier: data.config?.priceModifier ?? 1.0,
      // Whether shop uses buy-back
      allowSellback: data.config?.allowSellback ?? false,
      // Sellback price modifier
      sellbackModifier: data.config?.sellbackModifier ?? 0.5,
      // Currency type
      currency: data.config?.currency || game.settings.get(SHOP_MAKER.ID, "defaultCurrency")
    };
    
    // Shop inventory - array of item references with shop-specific data
    this.inventory = data.inventory || [];
    
    // Timestamps
    this.created = data.created || Date.now();
    this.modified = data.modified || Date.now();
  }

  /**
   * Generate default rarity configuration
   */
  _getDefaultRarityConfig() {
    const config = {};
    for (const [key, rarity] of Object.entries(SHOP_MAKER.RARITIES)) {
      config[key] = {
        enabled: key === "common" || key === "uncommon",
        maxQuantity: rarity.defaultQuantity,
        priceModifier: 1.0
      };
    }
    return config;
  }

  /**
   * Add an item to the shop inventory
   * @param {Object} itemData - The item data from compendium or world
   * @param {Object} options - Additional options like quantity, custom price
   */
  addItem(itemData, options = {}) {
    const existingIndex = this.inventory.findIndex(i => i.uuid === itemData.uuid);
    
    if (existingIndex >= 0) {
      // Update existing item quantity
      this.inventory[existingIndex].quantity += options.quantity || 1;
    } else {
      // Add new item
      this.inventory.push({
        id: foundry.utils.randomID(),
        uuid: itemData.uuid,
        name: itemData.name,
        img: itemData.img,
        type: itemData.type,
        rarity: itemData.system?.rarity || "common",
        basePrice: this._extractPrice(itemData),
        customPrice: options.customPrice || null,
        quantity: options.quantity ?? -1, // -1 means unlimited
        maxQuantity: options.maxQuantity ?? -1,
        description: itemData.system?.description?.value || ""
      });
    }
    
    this.modified = Date.now();
    return this;
  }

  /**
   * Remove an item from the shop inventory
   * @param {string} itemId - The shop inventory item ID
   */
  removeItem(itemId) {
    this.inventory = this.inventory.filter(i => i.id !== itemId);
    this.modified = Date.now();
    return this;
  }

  /**
   * Update an item in the inventory
   * @param {string} itemId - The shop inventory item ID
   * @param {Object} updates - The updates to apply
   */
  updateItem(itemId, updates) {
    const item = this.inventory.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
      this.modified = Date.now();
    }
    return this;
  }

  /**
   * Get the effective price for an item
   * @param {Object} inventoryItem - The inventory item
   */
  getItemPrice(inventoryItem) {
    const basePrice = inventoryItem.customPrice ?? inventoryItem.basePrice;
    const rarityModifier = this.config.rarityConfig[inventoryItem.rarity]?.priceModifier ?? 1.0;
    return Math.ceil(basePrice * this.config.priceModifier * rarityModifier);
  }

  /**
   * Extract price from item data
   * @param {Object} itemData - The item data
   */
  _extractPrice(itemData) {
    // Handle D&D 5e price structure
    if (itemData.system?.price?.value !== undefined) {
      return this._convertToCurrency(
        itemData.system.price.value,
        itemData.system.price.denomination || "gp"
      );
    }
    // Handle simple price field
    if (typeof itemData.system?.price === "number") {
      return itemData.system.price;
    }
    // Default price
    return 0;
  }

  /**
   * Convert a price to the shop's currency
   * @param {number} value - The price value
   * @param {string} fromCurrency - The source currency
   */
  _convertToCurrency(value, fromCurrency) {
    const fromRate = SHOP_MAKER.CURRENCY[fromCurrency]?.rate || 100;
    const toRate = SHOP_MAKER.CURRENCY[this.config.currency]?.rate || 100;
    return Math.ceil((value * fromRate) / toRate);
  }

  /**
   * Process a purchase from this shop
   * @param {string} itemId - The shop inventory item ID
   * @param {number} quantity - How many to purchase
   * @param {Actor} buyer - The actor making the purchase
   */
  async purchase(itemId, quantity, buyer) {
    const inventoryItem = this.inventory.find(i => i.id === itemId);
    if (!inventoryItem) {
      throw new Error("Item not found in shop inventory");
    }

    // Check quantity
    if (inventoryItem.quantity !== -1 && inventoryItem.quantity < quantity) {
      throw new Error("Insufficient quantity in stock");
    }

    // Calculate total cost
    const unitPrice = this.getItemPrice(inventoryItem);
    const totalCost = unitPrice * quantity;

    // Check buyer's funds
    const buyerFunds = this._getActorCurrency(buyer);
    if (buyerFunds < totalCost) {
      throw new Error("Insufficient funds");
    }

    // Deduct currency from buyer
    await this._deductCurrency(buyer, totalCost);

    // Add item to buyer's inventory
    const sourceItem = await fromUuid(inventoryItem.uuid);
    if (sourceItem) {
      const itemData = sourceItem.toObject();
      itemData.system.quantity = quantity;
      await buyer.createEmbeddedDocuments("Item", [itemData]);
    }

    // Update shop inventory
    if (inventoryItem.quantity !== -1) {
      inventoryItem.quantity -= quantity;
      if (inventoryItem.quantity <= 0) {
        this.removeItem(itemId);
      }
    }

    // Save the shop
    await this.save();

    // Emit socket event
    game.socket.emit(`module.${SHOP_MAKER.ID}`, {
      type: "purchase",
      shopId: this.id,
      shopName: this.name,
      itemId: itemId,
      itemName: inventoryItem.name,
      quantity: quantity,
      playerName: game.user.name
    });

    return { success: true, totalCost, item: inventoryItem };
  }

  /**
   * Get an actor's currency in the shop's currency type
   * @param {Actor} actor - The actor
   */
  _getActorCurrency(actor) {
    const currency = actor.system?.currency;
    if (!currency) return 0;

    // Convert all currency to shop currency
    let total = 0;
    for (const [type, amount] of Object.entries(currency)) {
      const rate = SHOP_MAKER.CURRENCY[type]?.rate || 0;
      const shopRate = SHOP_MAKER.CURRENCY[this.config.currency]?.rate || 100;
      total += (amount * rate) / shopRate;
    }
    return Math.floor(total);
  }

  /**
   * Deduct currency from an actor
   * @param {Actor} actor - The actor
   * @param {number} amount - Amount in shop currency
   */
  async _deductCurrency(actor, amount) {
    const shopRate = SHOP_MAKER.CURRENCY[this.config.currency]?.rate || 100;
    const copperAmount = amount * shopRate;
    
    // Simple implementation - deduct from highest denomination first
    const currency = foundry.utils.duplicate(actor.system.currency);
    let remaining = copperAmount;

    for (const denom of ["pp", "gp", "ep", "sp", "cp"]) {
      const rate = SHOP_MAKER.CURRENCY[denom]?.rate || 1;
      const available = currency[denom] * rate;
      
      if (available >= remaining) {
        currency[denom] -= Math.ceil(remaining / rate);
        remaining = 0;
        break;
      } else {
        remaining -= available;
        currency[denom] = 0;
      }
    }

    await actor.update({ "system.currency": currency });
  }

  /**
   * Map our shop item types to actual game system item types
   * @param {string} shopType - Our shop type
   * @returns {string[]} - Array of matching game item types
   */
  _mapItemType(shopType) {
    const typeMap = {
      general: ["loot", "consumable", "tool", "equipment"],
      weapon: ["weapon"],
      armor: ["equipment"], // D&D 5e uses "equipment" for armor
      scroll: ["consumable"], // Scrolls are consumables in 5e
      ingredient: ["loot", "consumable"],
      magic: ["weapon", "equipment", "consumable", "loot"], // Magic items can be any type
      consumable: ["consumable"],
      tool: ["tool"],
      loot: ["loot"]
    };
    return typeMap[shopType] || [shopType];
  }

  /**
   * Check if an item matches our shop's item type configuration
   * @param {Object} item - The item to check
   * @returns {boolean}
   */
  _itemMatchesShopTypes(item) {
    if (this.config.itemTypes.length === 0) return true;
    
    const itemType = item.type;
    for (const shopType of this.config.itemTypes) {
      const mappedTypes = this._mapItemType(shopType);
      if (mappedTypes.includes(itemType)) {
        // Additional check for magic items - they should have rarity uncommon+
        if (shopType === "magic") {
          const rarity = item.system?.rarity || "common";
          if (rarity !== "common") return true;
        } else {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Normalize rarity string to match our constants
   * @param {string} rarity - The rarity from the item
   * @returns {string}
   */
  _normalizeRarity(rarity) {
    if (!rarity) return "common";
    const rarityLower = rarity.toLowerCase().replace(/\s+/g, "");
    const rarityMap = {
      "common": "common",
      "uncommon": "uncommon",
      "rare": "rare",
      "veryrare": "veryRare",
      "legendary": "legendary",
      "artifact": "artifact"
    };
    return rarityMap[rarityLower] || "common";
  }

  /**
   * Populate shop inventory based on item type and rarity configuration
   * @param {Object} options - Population options
   */
  async populateFromCompendium(options = {}) {
    const { compendiumName } = options;
    
    // Get the compendium
    const pack = game.packs.get(compendiumName);
    if (!pack) {
      ui.notifications.warn(`Compendium ${compendiumName} not found`);
      return;
    }

    // Track how many items we've added per rarity
    const rarityCount = {};
    for (const rarity of Object.keys(SHOP_MAKER.RARITIES)) {
      rarityCount[rarity] = 0;
    }

    // Get all items from the compendium
    const items = await pack.getDocuments();
    
    // Shuffle items for random selection
    const shuffledItems = [...items].sort(() => Math.random() - 0.5);
    
    let addedCount = 0;
    
    for (const item of shuffledItems) {
      // Check item type matches shop configuration
      if (!this._itemMatchesShopTypes(item)) {
        continue;
      }

      // Get and normalize rarity
      const itemRarity = this._normalizeRarity(item.system?.rarity);
      
      // Check if rarity is enabled for this shop
      const rarityConfig = this.config.rarityConfig[itemRarity];
      if (!rarityConfig?.enabled) {
        continue;
      }

      // Check if we've hit the limit for this rarity
      const maxItems = rarityConfig.maxQuantity ?? -1;
      if (maxItems >= 0 && rarityCount[itemRarity] >= maxItems) {
        continue;
      }

      // Add to inventory (unlimited stock per item, but limited variety)
      this.addItem(item, { quantity: -1 });
      rarityCount[itemRarity]++;
      addedCount++;
    }

    console.log(`Shop Maker | Added ${addedCount} items from ${compendiumName}`);
    console.log("Shop Maker | Items per rarity:", rarityCount);

    await this.save();
    return this;
  }

  /**
   * Get filtered inventory
   * @param {Object} filters - Filter options
   */
  getFilteredInventory(filters = {}) {
    let items = [...this.inventory];

    if (filters.type) {
      items = items.filter(i => i.type === filters.type);
    }

    if (filters.rarity) {
      items = items.filter(i => i.rarity === filters.rarity);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(search));
    }

    if (filters.inStock) {
      items = items.filter(i => i.quantity === -1 || i.quantity > 0);
    }

    // Sort
    if (filters.sort) {
      items.sort((a, b) => {
        switch (filters.sort) {
          case "name":
            return a.name.localeCompare(b.name);
          case "price":
            return this.getItemPrice(a) - this.getItemPrice(b);
          case "rarity":
            const rarityOrder = Object.keys(SHOP_MAKER.RARITIES);
            return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
          default:
            return 0;
        }
      });

      if (filters.sortDir === "desc") {
        items.reverse();
      }
    }

    return items;
  }

  /**
   * Save the shop to settings
   */
  async save() {
    const shops = game.settings.get(SHOP_MAKER.ID, "shops");
    shops[this.id] = this.toObject();
    await game.settings.set(SHOP_MAKER.ID, "shops", shops);
    
    // Emit update event
    game.socket.emit(`module.${SHOP_MAKER.ID}`, {
      type: "shopUpdate",
      shopId: this.id
    });
    
    Hooks.callAll("shopMaker.shopUpdated", this.id);
    return this;
  }

  /**
   * Delete this shop
   */
  async delete() {
    const shops = game.settings.get(SHOP_MAKER.ID, "shops");
    delete shops[this.id];
    await game.settings.set(SHOP_MAKER.ID, "shops", shops);
    Hooks.callAll("shopMaker.shopDeleted", this.id);
  }

  /**
   * Convert to plain object for storage
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      image: this.image,
      owner: this.owner,
      isOpen: this.isOpen,
      config: foundry.utils.duplicate(this.config),
      inventory: foundry.utils.duplicate(this.inventory),
      created: this.created,
      modified: this.modified
    };
  }

  /**
   * Create a ShopDocument from stored data
   * @param {string} shopId - The shop ID to load
   */
  static load(shopId) {
    const shops = game.settings.get(SHOP_MAKER.ID, "shops");
    const data = shops[shopId];
    if (!data) return null;
    return new ShopDocument(data);
  }

  /**
   * Get all shops
   */
  static getAll() {
    const shops = game.settings.get(SHOP_MAKER.ID, "shops");
    return Object.values(shops).map(data => new ShopDocument(data));
  }
}

