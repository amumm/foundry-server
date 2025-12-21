/**
 * ShopMakerAPI - Public API for the Shop Maker module
 */

import { SHOP_MAKER } from "./constants.js";
import { ShopDocument } from "./documents/ShopDocument.js";
import { ShopConfig } from "./apps/ShopConfig.js";
import { ShopSheet } from "./apps/ShopSheet.js";
import { ShopBrowser } from "./apps/ShopBrowser.js";

export class ShopMakerAPI {
  constructor() {
    this._shopSheets = new Map();
  }

  /**
   * Create a new shop
   * @param {Object} data - Shop data
   * @returns {ShopDocument}
   */
  async createShop(data = {}) {
    const shop = new ShopDocument(data);
    await shop.save();
    ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ShopCreated", { name: shop.name }));
    return shop;
  }

  /**
   * Get a shop by ID
   * @param {string} shopId - The shop ID
   * @returns {ShopDocument|null}
   */
  getShop(shopId) {
    return ShopDocument.load(shopId);
  }

  /**
   * Get all shops
   * @returns {ShopDocument[]}
   */
  getAllShops() {
    return ShopDocument.getAll();
  }

  /**
   * Delete a shop
   * @param {string} shopId - The shop ID
   */
  async deleteShop(shopId) {
    const shop = this.getShop(shopId);
    if (shop) {
      await shop.delete();
      ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ShopDeleted", { name: shop.name }));
    }
  }

  /**
   * Open the shop configuration dialog
   * @param {string} shopId - Optional shop ID to edit
   */
  openShopConfig(shopId = null) {
    const shop = shopId ? this.getShop(shopId) : null;
    new ShopConfig(shop).render(true);
  }

  /**
   * Open a shop for browsing/shopping
   * @param {string} shopId - The shop ID
   * @param {Object} options - Rendering options
   */
  openShop(shopId, options = {}) {
    const shop = this.getShop(shopId);
    if (!shop) {
      ui.notifications.error(game.i18n.localize("SHOP_MAKER.Errors.ShopNotFound"));
      return;
    }

    // Check if shop is open
    if (!shop.isOpen && !game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("SHOP_MAKER.Errors.ShopClosed"));
      return;
    }

    // Reuse existing sheet or create new one
    if (this._shopSheets.has(shopId)) {
      const sheet = this._shopSheets.get(shopId);
      sheet.render(true, options);
    } else {
      const sheet = new ShopSheet(shop, options);
      this._shopSheets.set(shopId, sheet);
      sheet.render(true);
    }
  }

  /**
   * Open the shop browser
   */
  openShopBrowser() {
    new ShopBrowser().render(true);
  }

  /**
   * Add items from a compendium to a shop
   * @param {string} shopId - The shop ID
   * @param {string} compendiumName - The compendium name (e.g., "dnd5e.items")
   * @param {Object} options - Filter options
   */
  async populateShop(shopId, compendiumName, options = {}) {
    const shop = this.getShop(shopId);
    if (!shop) {
      ui.notifications.error(game.i18n.localize("SHOP_MAKER.Errors.ShopNotFound"));
      return;
    }

    await shop.populateFromCompendium({
      compendiumName,
      ...options
    });

    ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ShopPopulated", { 
      name: shop.name,
      count: shop.inventory.length 
    }));
  }

  /**
   * Get available item types
   * @returns {Object}
   */
  getItemTypes() {
    return SHOP_MAKER.ITEM_TYPES;
  }

  /**
   * Get available rarities
   * @returns {Object}
   */
  getRarities() {
    return SHOP_MAKER.RARITIES;
  }

  /**
   * Create a shop from a preset template
   * @param {string} preset - Preset name
   * @returns {ShopDocument}
   */
  async createFromPreset(preset) {
    const presets = {
      general: {
        name: "General Store",
        description: "A shop selling everyday adventuring supplies.",
        itemTypes: ["loot", "consumable", "tool"],
        enabledRarities: ["common", "uncommon"]
      },
      blacksmith: {
        name: "Blacksmith",
        description: "Weapons and armor for the discerning adventurer.",
        itemTypes: ["weapon", "armor"],
        enabledRarities: ["common", "uncommon", "rare"]
      },
      apothecary: {
        name: "Apothecary",
        description: "Potions, ingredients, and remedies.",
        itemTypes: ["consumable", "ingredient"],
        enabledRarities: ["common", "uncommon", "rare"]
      },
      magicShop: {
        name: "Magic Emporium",
        description: "Wondrous items and arcane curiosities.",
        itemTypes: ["scroll", "magic"],
        enabledRarities: ["uncommon", "rare", "veryRare"]
      }
    };

    const presetData = presets[preset];
    if (!presetData) {
      ui.notifications.error(`Unknown preset: ${preset}`);
      return null;
    }

    const shop = new ShopDocument({
      name: presetData.name,
      description: presetData.description,
      config: {
        itemTypes: presetData.itemTypes,
        rarityConfig: this._buildRarityConfig(presetData.enabledRarities)
      }
    });

    await shop.save();
    return shop;
  }

  /**
   * Build rarity config from enabled rarity list
   * @param {string[]} enabledRarities - List of enabled rarities
   */
  _buildRarityConfig(enabledRarities) {
    const config = {};
    for (const [key, rarity] of Object.entries(SHOP_MAKER.RARITIES)) {
      config[key] = {
        enabled: enabledRarities.includes(key),
        maxQuantity: rarity.defaultQuantity,
        priceModifier: 1.0
      };
    }
    return config;
  }
}

