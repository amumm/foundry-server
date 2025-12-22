/**
 * ShopConfig - Application for creating and editing shops (V2)
 */

import { SHOP_MAKER } from "../constants.js";
import { ShopDocument } from "../documents/ShopDocument.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ShopConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(shop = null, options = {}) {
    super(options);
    this.shop = shop || new ShopDocument();
    this.isNew = !shop;
  }

  static DEFAULT_OPTIONS = {
    id: "shop-config",
    classes: ["shop-maker", "shop-config"],
    window: {
      title: "SHOP_MAKER.ShopConfig.Title",
      icon: "fas fa-cog",
      resizable: true
    },
    position: {
      width: 600,
      height: "auto"
    },
    actions: {
      selectImage: ShopConfig.#onSelectImage,
      addFromCompendium: ShopConfig.#onAddFromCompendium,
      addItem: ShopConfig.#onAddItem,
      removeItem: ShopConfig.#onRemoveItem,
      saveShop: ShopConfig.#onSaveShop,
      deleteShop: ShopConfig.#onDeleteShop
    }
  };

  static PARTS = {
    main: {
      template: SHOP_MAKER.TEMPLATES.shopConfig
    }
  };

  get title() {
    return this.isNew
      ? game.i18n.localize("SHOP_MAKER.ShopConfig.TitleNew")
      : game.i18n.format("SHOP_MAKER.ShopConfig.TitleEdit", { name: this.shop.name });
  }

  async _prepareContext(options) {
    return {
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

  _onRender(context, options) {
    const html = this.element;

    // Tab handling
    this._activateTabs(html);

    // Name input
    const nameInput = html.querySelector("input[name='name']");
    if (nameInput) {
      nameInput.addEventListener("change", (e) => {
        this.shop.name = e.target.value || this.shop.name;
      });
    }

    // Description
    const descInput = html.querySelector("textarea[name='description']");
    if (descInput) {
      descInput.addEventListener("change", (e) => {
        this.shop.description = e.target.value || "";
      });
    }

    // Is Open checkbox
    const isOpenInput = html.querySelector("input[name='isOpen']");
    if (isOpenInput) {
      isOpenInput.addEventListener("change", (e) => {
        this.shop.isOpen = e.target.checked;
      });
    }

    // Item type checkboxes
    html.querySelectorAll(".item-type-checkbox").forEach(checkbox => {
      checkbox.addEventListener("change", (e) => {
        const itemType = e.target.dataset.type;
        if (e.target.checked) {
          if (!this.shop.config.itemTypes.includes(itemType)) {
            this.shop.config.itemTypes.push(itemType);
          }
        } else {
          this.shop.config.itemTypes = this.shop.config.itemTypes.filter(t => t !== itemType);
        }
      });
    });

    // Rarity checkboxes
    html.querySelectorAll(".rarity-checkbox").forEach(checkbox => {
      checkbox.addEventListener("change", (e) => {
        const rarity = e.target.dataset.rarity;
        this.shop.config.rarityConfig[rarity].enabled = e.target.checked;
        this.render();
      });
    });

    // Rarity quantity inputs
    html.querySelectorAll("input[name^='config.rarityConfig.'][name$='.maxQuantity']").forEach(input => {
      input.addEventListener("change", (e) => {
        const match = e.target.name.match(/config\.rarityConfig\.(\w+)\.maxQuantity/);
        if (match) {
          const rarity = match[1];
          this.shop.config.rarityConfig[rarity].maxQuantity = parseInt(e.target.value) || 0;
        }
      });
    });

    // Rarity price modifier inputs
    html.querySelectorAll("input[name^='config.rarityConfig.'][name$='.priceModifier']").forEach(input => {
      input.addEventListener("change", (e) => {
        const match = e.target.name.match(/config\.rarityConfig\.(\w+)\.priceModifier/);
        if (match) {
          const rarity = match[1];
          this.shop.config.rarityConfig[rarity].priceModifier = parseFloat(e.target.value) || 1.0;
        }
      });
    });

    // Currency select
    const currencySelect = html.querySelector("select[name='config.currency']");
    if (currencySelect) {
      currencySelect.addEventListener("change", (e) => {
        this.shop.config.currency = e.target.value;
      });
    }

    // Price modifier
    const priceModInput = html.querySelector("input[name='config.priceModifier']");
    if (priceModInput) {
      priceModInput.addEventListener("change", (e) => {
        this.shop.config.priceModifier = parseFloat(e.target.value) || 1.0;
      });
    }

    // Allow sellback
    const sellbackInput = html.querySelector("input[name='config.allowSellback']");
    if (sellbackInput) {
      sellbackInput.addEventListener("change", (e) => {
        this.shop.config.allowSellback = e.target.checked;
      });
    }

    // Sellback modifier
    const sellbackModInput = html.querySelector("input[name='config.sellbackModifier']");
    if (sellbackModInput) {
      sellbackModInput.addEventListener("change", (e) => {
        this.shop.config.sellbackModifier = parseFloat(e.target.value) || 0.5;
      });
    }

    // Image click
    const shopImage = html.querySelector(".shop-image");
    if (shopImage) {
      shopImage.addEventListener("click", () => this.#selectImage());
    }

    // Item price inputs
    html.querySelectorAll(".item-price-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const itemId = e.target.dataset.itemId;
        const value = e.target.value ? parseFloat(e.target.value) : null;
        this.shop.updateItem(itemId, { customPrice: value });
      });
    });

    // Item quantity inputs
    html.querySelectorAll(".item-qty-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const itemId = e.target.dataset.itemId;
        const value = parseInt(e.target.value) || -1;
        this.shop.updateItem(itemId, { quantity: value });
      });
    });
  }

  _activateTabs(html) {
    const tabs = html.querySelectorAll(".tabs .item");
    const tabContents = html.querySelectorAll(".tab");

    // Set initial active tab
    if (tabs.length > 0) {
      tabs[0].classList.add("active");
      const initialTab = tabs[0].dataset.tab;
      tabContents.forEach(content => {
        content.classList.toggle("active", content.dataset.tab === initialTab);
      });
    }

    tabs.forEach(tab => {
      tab.addEventListener("click", (e) => {
        const targetTab = e.currentTarget.dataset.tab;

        // Update tab buttons
        tabs.forEach(t => t.classList.remove("active"));
        e.currentTarget.classList.add("active");

        // Update tab content
        tabContents.forEach(content => {
          content.classList.toggle("active", content.dataset.tab === targetTab);
        });
      });
    });
  }

  async #selectImage() {
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

  static async #onSelectImage(event, target) {
    this.#selectImage();
  }

  static async #onAddFromCompendium(event, target) {
    const compendiumSelect = this.element.querySelector("#compendium-select");
    const compendiumId = compendiumSelect?.value;

    if (!compendiumId) {
      ui.notifications.warn(game.i18n.localize("SHOP_MAKER.Warnings.SelectCompendium"));
      return;
    }

    await this.shop.populateFromCompendium({
      compendiumName: compendiumId
    });

    ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ItemsAdded", {
      count: this.shop.inventory.length
    }));
    this.render();
  }

  static async #onAddItem(event, target) {
    const items = await this.#openItemPicker();
    if (items && items.length > 0) {
      for (const item of items) {
        this.shop.addItem(item);
      }
      this.render();
    }
  }

  async #openItemPicker() {
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
          this.#setupItemPickerListeners(html);
        },
        default: "add"
      }, { width: 500, height: 600 }).render(true);
    });
  }

  #setupItemPickerListeners(html) {
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

  static async #onRemoveItem(event, target) {
    const itemId = target.dataset.itemId;
    this.shop.removeItem(itemId);
    this.render();
  }

  static async #onSaveShop(event, target) {
    await this.shop.save();
    ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ShopSaved", { name: this.shop.name }));
    this.close();
  }

  static async #onDeleteShop(event, target) {
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
