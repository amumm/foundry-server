/**
 * Constants for the Shop Maker module
 */

export const SHOP_MAKER = {
  ID: "shop-maker",
  NAME: "Shop Maker",
  
  // Item types that can be included in shops
  ITEM_TYPES: {
    general: "SHOP_MAKER.ItemTypes.General",
    weapon: "SHOP_MAKER.ItemTypes.Weapon",
    armor: "SHOP_MAKER.ItemTypes.Armor",
    scroll: "SHOP_MAKER.ItemTypes.Scroll",
    ingredient: "SHOP_MAKER.ItemTypes.Ingredient",
    magic: "SHOP_MAKER.ItemTypes.Magic",
    consumable: "SHOP_MAKER.ItemTypes.Consumable",
    tool: "SHOP_MAKER.ItemTypes.Tool",
    loot: "SHOP_MAKER.ItemTypes.Loot"
  },

  // Rarity levels with default colors
  RARITIES: {
    common: {
      label: "SHOP_MAKER.Rarities.Common",
      color: "#1a1a1a",
      defaultQuantity: 10
    },
    uncommon: {
      label: "SHOP_MAKER.Rarities.Uncommon",
      color: "#1eff00",
      defaultQuantity: 2
    },
    rare: {
      label: "SHOP_MAKER.Rarities.Rare",
      color: "#0070dd",
      defaultQuantity: 1
    },
    veryRare: {
      label: "SHOP_MAKER.Rarities.VeryRare",
      color: "#a335ee",
      defaultQuantity: 1
    },
    legendary: {
      label: "SHOP_MAKER.Rarities.Legendary",
      color: "#ff8000",
      defaultQuantity: 1
    },
    artifact: {
      label: "SHOP_MAKER.Rarities.Artifact",
      color: "#e6cc80",
      defaultQuantity: 0
    }
  },

  // Currency conversion rates (to copper)
  CURRENCY: {
    cp: { label: "Copper", rate: 1 },
    sp: { label: "Silver", rate: 10 },
    ep: { label: "Electrum", rate: 50 },
    gp: { label: "Gold", rate: 100 },
    pp: { label: "Platinum", rate: 1000 }
  },

  // Templates
  TEMPLATES: {
    shopConfig: "modules/shop-maker/templates/shop-config.hbs",
    shopSheet: "modules/shop-maker/templates/shop-sheet.hbs",
    shopBrowser: "modules/shop-maker/templates/shop-browser.hbs",
    itemEntry: "modules/shop-maker/templates/partials/item-entry.hbs",
    categoryFilter: "modules/shop-maker/templates/partials/category-filter.hbs"
  }
};

