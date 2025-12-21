/**
 * ShopBrowser - Application for browsing and managing all shops
 */

import { SHOP_MAKER } from "../constants.js";
import { ShopDocument } from "../documents/ShopDocument.js";

export class ShopBrowser extends Application {
  constructor(options = {}) {
    super(options);
    this.searchFilter = "";
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "shop-browser",
      classes: ["shop-maker", "shop-browser"],
      title: "SHOP_MAKER.ShopBrowser.Title",
      template: SHOP_MAKER.TEMPLATES.shopBrowser,
      width: 500,
      height: 500,
      resizable: true
    });
  }

  async getData() {
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

  activateListeners(html) {
    super.activateListeners(html);

    // Search
    html.find(".search-input").on("input", foundry.utils.debounce((e) => {
      this.searchFilter = e.target.value;
      this.render();
    }, 300));

    // Create new shop
    html.find(".create-shop").on("click", this._onCreateShop.bind(this));

    // Create from preset
    html.find(".create-preset").on("click", this._onCreatePreset.bind(this));

    // Open shop
    html.find(".open-shop").on("click", this._onOpenShop.bind(this));

    // Edit shop
    html.find(".edit-shop").on("click", this._onEditShop.bind(this));

    // Delete shop
    html.find(".delete-shop").on("click", this._onDeleteShop.bind(this));

    // Toggle shop open/closed
    html.find(".toggle-shop").on("click", this._onToggleShop.bind(this));

    // Duplicate shop
    html.find(".duplicate-shop").on("click", this._onDuplicateShop.bind(this));

    // Share with players
    html.find(".share-shop").on("click", this._onShareShop.bind(this));
  }

  _onCreateShop(event) {
    event.preventDefault();
    game.shopMaker.openShopConfig();
  }

  async _onCreatePreset(event) {
    event.preventDefault();
    
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

  _onOpenShop(event) {
    event.preventDefault();
    const shopId = event.currentTarget.closest(".shop-entry").dataset.shopId;
    game.shopMaker.openShop(shopId);
  }

  _onEditShop(event) {
    event.preventDefault();
    const shopId = event.currentTarget.closest(".shop-entry").dataset.shopId;
    game.shopMaker.openShopConfig(shopId);
  }

  async _onDeleteShop(event) {
    event.preventDefault();
    const shopId = event.currentTarget.closest(".shop-entry").dataset.shopId;
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

  async _onToggleShop(event) {
    event.preventDefault();
    const shopId = event.currentTarget.closest(".shop-entry").dataset.shopId;
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

  async _onDuplicateShop(event) {
    event.preventDefault();
    const shopId = event.currentTarget.closest(".shop-entry").dataset.shopId;
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

  async _onShareShop(event) {
    event.preventDefault();
    const shopId = event.currentTarget.closest(".shop-entry").dataset.shopId;
    const shop = game.shopMaker.getShop(shopId);
    
    if (shop) {
      // Create a chat message with a button to open the shop
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

