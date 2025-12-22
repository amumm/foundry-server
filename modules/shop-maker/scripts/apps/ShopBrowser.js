/**
 * ShopBrowser - Application for browsing and managing all shops (V2)
 */

import { SHOP_MAKER } from "../constants.js";
import { ShopDocument } from "../documents/ShopDocument.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ShopBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.searchFilter = "";
  }

  static DEFAULT_OPTIONS = {
    id: "shop-browser",
    classes: ["shop-maker", "shop-browser"],
    window: {
      title: "SHOP_MAKER.ShopBrowser.Title",
      icon: "fas fa-store",
      resizable: true
    },
    position: {
      width: 500,
      height: 500
    },
    actions: {
      createShop: ShopBrowser.#onCreateShop,
      createPreset: ShopBrowser.#onCreatePreset,
      openShop: ShopBrowser.#onOpenShop,
      editShop: ShopBrowser.#onEditShop,
      deleteShop: ShopBrowser.#onDeleteShop,
      toggleShop: ShopBrowser.#onToggleShop,
      duplicateShop: ShopBrowser.#onDuplicateShop,
      shareShop: ShopBrowser.#onShareShop
    }
  };

  static PARTS = {
    main: {
      template: SHOP_MAKER.TEMPLATES.shopBrowser
    }
  };

  get title() {
    return game.i18n.localize("SHOP_MAKER.ShopBrowser.Title");
  }

  async _prepareContext(options) {
    let shops = ShopDocument.getAll();

    // Filter by search
    if (this.searchFilter) {
      const search = this.searchFilter.toLowerCase();
      shops = shops.filter(s => s.name.toLowerCase().includes(search));
    }

    // Sort by name
    shops.sort((a, b) => a.name.localeCompare(b.name));

    return {
      shops: shops.map(shop => ({
        ...shop,
        itemCount: shop.inventory.length,
        typeCount: [...new Set(shop.inventory.map(i => i.type))].length,
        isOwner: shop.owner === game.user.id || game.user.isGM
      })),
      isGM: game.user.isGM,
      searchFilter: this.searchFilter
    };
  }

  _onRender(context, options) {
    // Search input
    const searchInput = this.element.querySelector(".search-input");
    if (searchInput) {
      searchInput.addEventListener("input", foundry.utils.debounce((e) => {
        this.searchFilter = e.target.value;
        this.render();
      }, 300));
    }
  }

  static async #onCreateShop(event, target) {
    game.shopMaker.openShopConfig();
  }

  static async #onCreatePreset(event, target) {
    const content = `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("SHOP_MAKER.ShopBrowser.SelectPreset")}</label>
          <select name="preset">
            <option value="general">${game.i18n.localize("SHOP_MAKER.Presets.GeneralStore")}</option>
            <option value="blacksmith">${game.i18n.localize("SHOP_MAKER.Presets.Blacksmith")}</option>
            <option value="apothecary">${game.i18n.localize("SHOP_MAKER.Presets.Apothecary")}</option>
            <option value="magicShop">${game.i18n.localize("SHOP_MAKER.Presets.MagicShop")}</option>
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: game.i18n.localize("SHOP_MAKER.ShopBrowser.CreateFromPreset"),
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: game.i18n.localize("Create"),
          callback: async (html) => {
            const preset = html.find("[name=preset]").val();
            await game.shopMaker.createFromPreset(preset);
            this.render();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel")
        }
      },
      default: "create"
    }).render(true);
  }

  static #onOpenShop(event, target) {
    const shopId = target.closest(".shop-entry").dataset.shopId;
    game.shopMaker.openShop(shopId);
  }

  static #onEditShop(event, target) {
    const shopId = target.closest(".shop-entry").dataset.shopId;
    game.shopMaker.openShopConfig(shopId);
  }

  static async #onDeleteShop(event, target) {
    const shopId = target.closest(".shop-entry").dataset.shopId;
    const shop = game.shopMaker.getShop(shopId);

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("SHOP_MAKER.ShopBrowser.DeleteConfirmTitle"),
      content: game.i18n.format("SHOP_MAKER.ShopBrowser.DeleteConfirmContent", { name: shop.name })
    });

    if (confirmed) {
      await game.shopMaker.deleteShop(shopId);
      this.render();
    }
  }

  static async #onToggleShop(event, target) {
    const shopId = target.closest(".shop-entry").dataset.shopId;
    const shop = game.shopMaker.getShop(shopId);

    if (shop) {
      shop.isOpen = !shop.isOpen;
      await shop.save();
      this.render();

      const status = shop.isOpen
        ? game.i18n.localize("SHOP_MAKER.ShopBrowser.StatusOpen")
        : game.i18n.localize("SHOP_MAKER.ShopBrowser.StatusClosed");
      ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ShopStatusChanged", {
        name: shop.name,
        status
      }));
    }
  }

  static async #onDuplicateShop(event, target) {
    const shopId = target.closest(".shop-entry").dataset.shopId;
    const shop = game.shopMaker.getShop(shopId);

    if (shop) {
      const newShop = new ShopDocument({
        ...shop.toObject(),
        id: foundry.utils.randomID(),
        name: `${shop.name} (Copy)`,
        created: Date.now(),
        modified: Date.now()
      });
      await newShop.save();
      this.render();
      ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.ShopDuplicated", { name: shop.name }));
    }
  }

  static async #onShareShop(event, target) {
    const shopId = target.closest(".shop-entry").dataset.shopId;
    const shop = game.shopMaker.getShop(shopId);

    if (shop) {
      const content = await renderTemplate(
        "modules/shop-maker/templates/chat/shop-card.hbs",
        {
          shop,
          itemCount: shop.inventory.length
        }
      );

      ChatMessage.create({
        content,
        speaker: ChatMessage.getSpeaker()
      });
    }
  }
}

// Handle chat message button clicks
Hooks.on("renderChatMessage", (message, html) => {
  html.find(".shop-card-open").on("click", (event) => {
    const shopId = event.currentTarget.dataset.shopId;
    game.shopMaker.openShop(shopId);
  });
});
