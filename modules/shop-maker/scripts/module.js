/**
 * Shop Maker - A Foundry VTT module for creating and managing shops
 */

import { ShopMakerAPI } from "./api.js";
import { ShopConfig } from "./apps/ShopConfig.js";
import { ShopSheet } from "./apps/ShopSheet.js";
import { SHOP_MAKER } from "./constants.js";
import { ShopDocument } from "./documents/ShopDocument.js";

// Module initialization
Hooks.once("init", () => {
  console.log("Shop Maker | Initializing Shop Maker module");

  // Register module settings
  game.settings.register(SHOP_MAKER.ID, "shops", {
    name: "Shops Data",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(SHOP_MAKER.ID, "defaultCurrency", {
    name: "SHOP_MAKER.Settings.DefaultCurrency",
    hint: "SHOP_MAKER.Settings.DefaultCurrencyHint",
    scope: "world",
    config: true,
    type: String,
    default: "gp",
    choices: {
      "cp": "Copper (cp)",
      "sp": "Silver (sp)",
      "ep": "Electrum (ep)",
      "gp": "Gold (gp)",
      "pp": "Platinum (pp)"
    }
  });

  game.settings.register(SHOP_MAKER.ID, "allowPlayerPurchase", {
    name: "SHOP_MAKER.Settings.AllowPlayerPurchase",
    hint: "SHOP_MAKER.Settings.AllowPlayerPurchaseHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Expose API
  game.shopMaker = new ShopMakerAPI();
});

// Ready hook - set up UI elements
Hooks.once("ready", () => {
  console.log("Shop Maker | Module ready");
  console.log("Shop Maker | API available at game.shopMaker");
  console.log("Shop Maker | Use game.shopMaker.openShopBrowser() to open the shop browser");
  console.log("Shop Maker | Use game.shopMaker.openShopConfig() to create a new shop");
});

// Add a simple macro command for easier access
Hooks.on("chatMessage", (chatLog, message, chatData) => {
  if (message.toLowerCase() === "/shops") {
    if (game.user.isGM) {
      game.shopMaker.openShopBrowser();
    } else {
      ui.notifications.warn("Only GMs can manage shops");
    }
    return false; // Prevent the message from being sent
  }
});

// Add shop controls to the scene controls
// Foundry v13 changed the controls structure - it's now an object, not an array
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;

  // Foundry v13+ uses object structure with tools as an object
  controls["shopMaker"] = {
    name: "shopMaker",
    title: game.i18n.localize("SHOP_MAKER.Controls.Title"),
    icon: "fas fa-store",
    layer: "tokens",
    visible: true,
    activeTool: "select",
    tools: {
      createShop: {
        name: "createShop",
        title: game.i18n.localize("SHOP_MAKER.Controls.CreateShop"),
        icon: "fas fa-plus",
        visible: true,
        button: true,
        onChange: () => {
          console.log("Shop Maker | Create Shop clicked");
          try {
            new ShopConfig().render(true);
          } catch (err) {
            console.error("Shop Maker | Error opening ShopConfig:", err);
            ui.notifications.error("Failed to open shop configuration");
          }
        }
      },
      manageShops: {
        name: "manageShops",
        title: game.i18n.localize("SHOP_MAKER.Controls.ManageShops"),
        icon: "fas fa-list",
        visible: true,
        button: true,
        onChange: () => {
          console.log("Shop Maker | Manage Shops clicked");
          try {
            game.shopMaker.openShopBrowser();
          } catch (err) {
            console.error("Shop Maker | Error opening ShopBrowser:", err);
            ui.notifications.error("Failed to open shop browser");
          }
        }
      }
    }
  };
});

// Socket handling for real-time updates
Hooks.once("ready", () => {
  game.socket.on(`module.${SHOP_MAKER.ID}`, async (data) => {
    if (data.type === "shopUpdate") {
      // Handle shop updates from other clients
      Hooks.callAll("shopMaker.shopUpdated", data.shopId);
    } else if (data.type === "purchase") {
      // Handle purchase notifications
      if (game.user.isGM) {
        ui.notifications.info(game.i18n.format("SHOP_MAKER.Notifications.PlayerPurchased", {
          player: data.playerName,
          item: data.itemName,
          shop: data.shopName
        }));
      }
    }
  });
});

// Export classes for external use
export { ShopConfig, ShopSheet, ShopDocument, ShopMakerAPI };

