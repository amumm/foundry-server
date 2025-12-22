/**
 * ShopSheet - Application for players to browse and purchase from shops (V2)
 */

import { SHOP_MAKER } from "../constants.js";
import { ShopDocument } from "../documents/ShopDocument.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ShopSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(shop, options = {}) {
    super(options);
    this.shop = shop;
    this.filters = {
      type: null,
      rarity: null,
      search: "",
      sort: "name",
      sortDir: "asc",
      inStock: true
    };
    this.selectedActor = options.actor || this._getDefaultActor();
  }

  static DEFAULT_OPTIONS = {
    id: "shop-sheet",
    classes: ["shop-maker", "shop-sheet"],
    window: {
      title: "Shop",
      icon: "fas fa-store",
      resizable: true
    },
    position: {
      width: 700,
      height: 600
    },
    actions: {
      purchase: ShopSheet.#onPurchase,
      viewItem: ShopSheet.#onViewItem,
      editShop: ShopSheet.#onEditShop,
      refresh: ShopSheet.#onRefresh
    }
  };

  static PARTS = {
    main: {
      template: SHOP_MAKER.TEMPLATES.shopSheet
    }
  };

  get title() {
    return this.shop.name;
  }

  _getDefaultActor() {
    return game.user.character || game.actors.find(a => a.isOwner && a.type === "character");
  }

  async _prepareContext(options) {
    // Refresh shop data
    const freshShop = ShopDocument.load(this.shop.id);
    if (freshShop) {
      this.shop = freshShop;
    }

    const inventory = this.shop.getFilteredInventory(this.filters);
    const actorCurrency = this.selectedActor ? this._getActorCurrencyDisplay() : null;
    const selectedActorId = this.selectedActor?.id;

    return {
      shop: this.shop,
      inventory: inventory.map(item => ({
        ...item,
        price: this.shop.getItemPrice(item),
        priceDisplay: this._formatPrice(this.shop.getItemPrice(item)),
        rarityColor: SHOP_MAKER.RARITIES[item.rarity]?.color || "#1a1a1a",
        rarityLabel: game.i18n.localize(SHOP_MAKER.RARITIES[item.rarity]?.label || "Common"),
        quantityDisplay: item.quantity === -1 ? "∞" : item.quantity,
        inStock: item.quantity === -1 || item.quantity > 0,
        canAfford: this._canAfford(item)
      })),
      filters: this.filters,
      itemTypes: this._getFilterOptions("type"),
      rarities: this._getFilterOptions("rarity"),
      sortOptions: [
        { value: "name", label: game.i18n.localize("SHOP_MAKER.Sort.Name"), selected: this.filters.sort === "name" },
        { value: "price", label: game.i18n.localize("SHOP_MAKER.Sort.Price"), selected: this.filters.sort === "price" },
        { value: "rarity", label: game.i18n.localize("SHOP_MAKER.Sort.Rarity"), selected: this.filters.sort === "rarity" }
      ],
      sortIcon: this.filters.sortDir === "asc" ? "up" : "down",
      selectedActor: this.selectedActor,
      actorCurrency,
      currency: SHOP_MAKER.CURRENCY[this.shop.config.currency],
      isGM: game.user.isGM,
      canPurchase: game.settings.get(SHOP_MAKER.ID, "allowPlayerPurchase") || game.user.isGM,
      ownedActors: game.actors.filter(a => a.isOwner && a.type === "character").map(a => ({
        id: a.id,
        name: a.name,
        isSelected: a.id === selectedActorId
      }))
    };
  }

  _getFilterOptions(filterType) {
    if (filterType === "type") {
      const types = [...new Set(this.shop.inventory.map(i => i.type))];
      return types.map(t => ({
        value: t,
        label: game.i18n.localize(SHOP_MAKER.ITEM_TYPES[t] || t),
        selected: this.filters.type === t
      }));
    } else if (filterType === "rarity") {
      const rarities = [...new Set(this.shop.inventory.map(i => i.rarity))];
      return rarities.map(r => ({
        value: r,
        label: game.i18n.localize(SHOP_MAKER.RARITIES[r]?.label || r),
        color: SHOP_MAKER.RARITIES[r]?.color,
        selected: this.filters.rarity === r
      }));
    }
    return [];
  }

  _formatPrice(price) {
    const currency = this.shop.config.currency;
    return `${price} ${currency}`;
  }

  _getActorCurrencyDisplay() {
    if (!this.selectedActor?.system?.currency) return null;

    const currency = this.selectedActor.system.currency;
    const parts = [];
    for (const denom of ["pp", "gp", "ep", "sp", "cp"]) {
      if (currency[denom] > 0) {
        parts.push(`${currency[denom]} ${denom}`);
      }
    }
    return parts.join(", ") || "0 gp";
  }

  _canAfford(item) {
    if (!this.selectedActor) return false;
    const price = this.shop.getItemPrice(item);
    const funds = this._getActorFundsInShopCurrency();
    return funds >= price;
  }

  _getActorFundsInShopCurrency() {
    if (!this.selectedActor?.system?.currency) return 0;

    const currency = this.selectedActor.system.currency;
    const shopRate = SHOP_MAKER.CURRENCY[this.shop.config.currency]?.rate || 100;

    let totalCopper = 0;
    for (const [denom, amount] of Object.entries(currency)) {
      const rate = SHOP_MAKER.CURRENCY[denom]?.rate || 0;
      totalCopper += amount * rate;
    }

    return Math.floor(totalCopper / shopRate);
  }

  _onRender(context, options) {
    const html = this.element;

    // Search
    const searchInput = html.querySelector(".search-input");
    if (searchInput) {
      searchInput.addEventListener("input", foundry.utils.debounce((e) => {
        this.filters.search = e.target.value;
        this.render();
      }, 300));
    }

    // Type filter
    const typeFilter = html.querySelector(".type-filter");
    if (typeFilter) {
      typeFilter.addEventListener("change", (e) => {
        this.filters.type = e.target.value || null;
        this.render();
      });
    }

    // Rarity filter
    const rarityFilter = html.querySelector(".rarity-filter");
    if (rarityFilter) {
      rarityFilter.addEventListener("change", (e) => {
        this.filters.rarity = e.target.value || null;
        this.render();
      });
    }

    // Sort
    const sortSelect = html.querySelector(".sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.filters.sort = e.target.value;
        this.render();
      });
    }

    // Sort direction
    const sortDirection = html.querySelector(".sort-direction");
    if (sortDirection) {
      sortDirection.addEventListener("click", () => {
        this.filters.sortDir = this.filters.sortDir === "asc" ? "desc" : "asc";
        this.render();
      });
    }

    // In stock filter
    const inStockFilter = html.querySelector(".in-stock-filter");
    if (inStockFilter) {
      inStockFilter.addEventListener("change", (e) => {
        this.filters.inStock = e.target.checked;
        this.render();
      });
    }

    // Actor selection
    const actorSelect = html.querySelector(".actor-select");
    if (actorSelect) {
      actorSelect.addEventListener("change", (e) => {
        const actorId = e.target.value;
        this.selectedActor = game.actors.get(actorId);
        this.render();
      });
    }

    // Item name click for details
    html.querySelectorAll(".item-name").forEach(el => {
      el.addEventListener("click", async (e) => {
        const itemId = e.target.closest(".shop-item").dataset.itemId;
        const item = this.shop.inventory.find(i => i.id === itemId);
        if (item?.uuid) {
          const sourceItem = await fromUuid(item.uuid);
          if (sourceItem) {
            sourceItem.sheet.render(true);
          }
        }
      });
    });
  }

  static async #onPurchase(event, target) {
    const itemId = target.closest(".shop-item").dataset.itemId;
    const item = this.shop.inventory.find(i => i.id === itemId);

    if (!item) {
      ui.notifications.error(game.i18n.localize("SHOP_MAKER.Errors.ItemNotFound"));
      return;
    }

    if (!this.selectedActor) {
      ui.notifications.warn(game.i18n.localize("SHOP_MAKER.Warnings.SelectActor"));
      return;
    }

    const price = this.shop.getItemPrice(item);
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("SHOP_MAKER.Purchase.ConfirmTitle"),
      content: game.i18n.format("SHOP_MAKER.Purchase.ConfirmContent", {
        item: item.name,
        price: this._formatPrice(price),
        actor: this.selectedActor.name
      })
    });

    if (!confirmed) return;

    try {
      const result = await this.shop.purchase(itemId, 1, this.selectedActor);
      ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.PurchaseSuccess", {
        item: item.name,
        price: this._formatPrice(result.totalCost)
      }));
      this.render();
    } catch (err) {
      ui.notifications.error(err.message);
    }
  }

  static async #onViewItem(event, target) {
    const itemId = target.closest(".shop-item").dataset.itemId;
    const item = this.shop.inventory.find(i => i.id === itemId);

    if (item?.uuid) {
      const sourceItem = await fromUuid(item.uuid);
      if (sourceItem) {
        sourceItem.sheet.render(true);
      }
    }
  }

  static #onEditShop(event, target) {
    game.shopMaker.openShopConfig(this.shop.id);
  }

  static #onRefresh(event, target) {
    this.shop = ShopDocument.load(this.shop.id);
    this.render();
  }
}
