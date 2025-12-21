/**
 * ShopConfig - Application for creating and editing shops
 */

import { SHOP_MAKER } from "../constants.js";
import { ShopDocument } from "../documents/ShopDocument.js";

export class ShopConfig extends FormApplication {
  constructor(shop = null, options = {}) {
    super(shop, options);
    this.shop = shop || new ShopDocument();
    this.isNew = !shop;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "shop-config",
      classes: ["shop-maker", "shop-config"],
      title: "SHOP_MAKER.ShopConfig.Title",
      template: SHOP_MAKER.TEMPLATES.shopConfig,
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".tab-content", initial: "general" }]
    });
  }

  get title() {
    return this.isNew 
      ? game.i18n.localize("SHOP_MAKER.ShopConfig.TitleNew")
      : game.i18n.format("SHOP_MAKER.ShopConfig.TitleEdit", { name: this.shop.name });
  }

  async getData() {
    const data = await super.getData();
    
    return {
      ...data,
      shop: this.shop,
      isNew: this.isNew,
      itemTypes: this._getItemTypesData(),
      rarities: this._getRaritiesData(),
      currencies: this._getCurrenciesData(),
      compendiums: this._getItemCompendiums()
    };
  }

  _getItemTypesData() {
    const types = [];
    for (const [key, label] of Object.entries(SHOP_MAKER.ITEM_TYPES)) {
      types.push({
        key,
        label: game.i18n.localize(label),
        checked: this.shop.config.itemTypes.includes(key)
      });
    }
    return types;
  }

  _getRaritiesData() {
    const rarities = [];
    for (const [key, rarity] of Object.entries(SHOP_MAKER.RARITIES)) {
      const config = this.shop.config.rarityConfig[key] || {};
      rarities.push({
        key,
        label: game.i18n.localize(rarity.label),
        color: rarity.color,
        enabled: config.enabled ?? false,
        maxQuantity: config.maxQuantity ?? rarity.defaultQuantity,
        priceModifier: config.priceModifier ?? 1.0
      });
    }
    return rarities;
  }

  _getCurrenciesData() {
    const currencies = [];
    for (const [key, data] of Object.entries(SHOP_MAKER.CURRENCY)) {
      currencies.push({
        key,
        label: data.label,
        selected: this.shop.config.currency === key
      });
    }
    return currencies;
  }

  _getItemCompendiums() {
    return game.packs
      .filter(p => p.documentName === "Item")
      .map(p => ({
        id: p.collection,
        label: p.title
      }));
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Image selection
    html.find(".shop-image").on("click", this._onSelectImage.bind(this));

    // Add from compendium
    html.find(".add-from-compendium").on("click", this._onAddFromCompendium.bind(this));

    // Add item manually
    html.find(".add-item").on("click", this._onAddItem.bind(this));

    // Remove item
    html.find(".remove-item").on("click", this._onRemoveItem.bind(this));

    // Save and close
    html.find(".save-shop").on("click", this._onSaveShop.bind(this));

    // Delete shop
    html.find(".delete-shop").on("click", this._onDeleteShop.bind(this));

    // Item type checkboxes
    html.find(".item-type-checkbox").on("change", this._onItemTypeChange.bind(this));

    // Rarity checkboxes
    html.find(".rarity-checkbox").on("change", this._onRarityChange.bind(this));
  }

  async _onSelectImage(event) {
    event.preventDefault();
    const fp = new FilePicker({
      type: "image",
      current: this.shop.image,
      callback: async (path) => {
        this.shop.image = path;
        this.render();
      }
    });
    fp.browse();
  }

  async _onAddFromCompendium(event) {
    event.preventDefault();
    const compendiumSelect = this.element.find("#compendium-select");
    const compendiumId = compendiumSelect.val();
    
    if (!compendiumId) {
      ui.notifications.warn(game.i18n.localize("SHOP_MAKER.Warnings.SelectCompendium"));
      return;
    }

    await this.shop.populateFromCompendium({
      compendiumName: compendiumId,
      itemTypes: this.shop.config.itemTypes,
      rarities: Object.entries(this.shop.config.rarityConfig)
        .filter(([_, config]) => config.enabled)
        .map(([key]) => key)
    });

    ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ItemsAdded", { 
      count: this.shop.inventory.length 
    }));
    this.render();
  }

  async _onAddItem(event) {
    event.preventDefault();
    
    // Open item picker dialog
    const items = await this._openItemPicker();
    if (items && items.length > 0) {
      for (const item of items) {
        this.shop.addItem(item);
      }
      this.render();
    }
  }

  async _openItemPicker() {
    return new Promise((resolve) => {
      const content = `
        <div class="item-picker">
          <div class="form-group">
            <label>${game.i18n.localize("SHOP_MAKER.ItemPicker.Source")}</label>
            <select id="item-source">
              <option value="world">${game.i18n.localize("SHOP_MAKER.ItemPicker.WorldItems")}</option>
              ${game.packs.filter(p => p.documentName === "Item").map(p => 
                `<option value="${p.collection}">${p.title}</option>`
              ).join("")}
            </select>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SHOP_MAKER.ItemPicker.Search")}</label>
            <input type="text" id="item-search" placeholder="${game.i18n.localize("SHOP_MAKER.ItemPicker.SearchPlaceholder")}">
          </div>
          <div class="item-list" id="item-results"></div>
        </div>
      `;

      new Dialog({
        title: game.i18n.localize("SHOP_MAKER.ItemPicker.Title"),
        content,
        buttons: {
          add: {
            icon: '<i class="fas fa-plus"></i>',
            label: game.i18n.localize("SHOP_MAKER.ItemPicker.Add"),
            callback: async (html) => {
              const selected = html.find(".item-entry.selected");
              const items = [];
              for (const el of selected) {
                const uuid = el.dataset.uuid;
                const item = await fromUuid(uuid);
                if (item) items.push(item);
              }
              resolve(items);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("Cancel"),
            callback: () => resolve([])
          }
        },
        render: (html) => {
          this._setupItemPickerListeners(html);
        },
        default: "add"
      }, { width: 500, height: 600 }).render(true);
    });
  }

  _setupItemPickerListeners(html) {
    const searchInput = html.find("#item-search");
    const sourceSelect = html.find("#item-source");
    const resultsContainer = html.find("#item-results");

    const doSearch = foundry.utils.debounce(async () => {
      const source = sourceSelect.val();
      const search = searchInput.val().toLowerCase();
      
      let items = [];
      if (source === "world") {
        items = game.items.filter(i => 
          i.name.toLowerCase().includes(search)
        );
      } else {
        const pack = game.packs.get(source);
        if (pack) {
          const index = await pack.getIndex();
          const matchingEntries = index.filter(e => 
            e.name.toLowerCase().includes(search)
          );
          items = matchingEntries.slice(0, 50).map(e => ({
            uuid: `Compendium.${source}.${e._id}`,
            name: e.name,
            img: e.img || "icons/svg/item-bag.svg"
          }));
        }
      }

      resultsContainer.empty();
      for (const item of items.slice(0, 50)) {
        const uuid = item.uuid || `Item.${item.id}`;
        resultsContainer.append(`
          <div class="item-entry" data-uuid="${uuid}">
            <img src="${item.img}" width="24" height="24">
            <span>${item.name}</span>
          </div>
        `);
      }

      resultsContainer.find(".item-entry").on("click", (e) => {
        $(e.currentTarget).toggleClass("selected");
      });
    }, 300);

    searchInput.on("input", doSearch);
    sourceSelect.on("change", doSearch);
    doSearch();
  }

  async _onRemoveItem(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    this.shop.removeItem(itemId);
    this.render();
  }

  _onItemTypeChange(event) {
    const checkbox = event.currentTarget;
    const itemType = checkbox.dataset.type;
    
    if (checkbox.checked) {
      if (!this.shop.config.itemTypes.includes(itemType)) {
        this.shop.config.itemTypes.push(itemType);
      }
    } else {
      this.shop.config.itemTypes = this.shop.config.itemTypes.filter(t => t !== itemType);
    }
  }

  _onRarityChange(event) {
    const checkbox = event.currentTarget;
    const rarity = checkbox.dataset.rarity;
    this.shop.config.rarityConfig[rarity].enabled = checkbox.checked;
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    
    // Update basic properties
    this.shop.name = expanded.name || this.shop.name;
    this.shop.description = expanded.description || "";
    this.shop.isOpen = expanded.isOpen ?? true;
    
    // Update config
    if (expanded.config) {
      this.shop.config.priceModifier = parseFloat(expanded.config.priceModifier) || 1.0;
      this.shop.config.allowSellback = expanded.config.allowSellback ?? false;
      this.shop.config.sellbackModifier = parseFloat(expanded.config.sellbackModifier) || 0.5;
      this.shop.config.currency = expanded.config.currency || "gp";
      
      // Update rarity quantities and modifiers
      if (expanded.config.rarityConfig) {
        for (const [rarity, config] of Object.entries(expanded.config.rarityConfig)) {
          if (this.shop.config.rarityConfig[rarity]) {
            this.shop.config.rarityConfig[rarity].maxQuantity = parseInt(config.maxQuantity) || 0;
            this.shop.config.rarityConfig[rarity].priceModifier = parseFloat(config.priceModifier) || 1.0;
          }
        }
      }
    }
  }

  async _onSaveShop(event) {
    event.preventDefault();
    await this.submit();
    await this.shop.save();
    
    ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ShopSaved", { name: this.shop.name }));
    this.close();
  }

  async _onDeleteShop(event) {
    event.preventDefault();
    
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("SHOP_MAKER.ShopConfig.DeleteConfirmTitle"),
      content: game.i18n.format("SHOP_MAKER.ShopConfig.DeleteConfirmContent", { name: this.shop.name })
    });

    if (confirmed) {
      await this.shop.delete();
      ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ShopDeleted", { name: this.shop.name }));
      this.close();
    }
  }
}

