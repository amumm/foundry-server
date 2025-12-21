# Shop Maker - Foundry VTT Module

A Foundry VTT module for creating and managing shops where players can browse and purchase items.

## Features

- **Create Custom Shops**: Build shops with specific item types, rarity configurations, and pricing
- **Item Type Filtering**: Configure shops to carry specific types of items (weapons, armor, scrolls, consumables, etc.)
- **Rarity System**: Set which rarities each shop carries and configure quantity limits per rarity level
- **Dynamic Pricing**: Apply price modifiers at the shop level and per rarity
- **Player Shopping Interface**: Beautiful, filterable shop UI for players to browse and purchase items
- **Compendium Integration**: Quickly populate shops from any item compendium
- **Currency Support**: Full support for D&D 5e currency (cp, sp, ep, gp, pp)
- **Real-time Updates**: Socket-based updates keep all clients in sync
- **Shop Presets**: Quick-start templates for common shop types

## Installation

### Manual Installation
1. Copy the `shop-maker` folder to your Foundry VTT `Data/modules/` directory
2. Restart Foundry VTT
3. Enable the module in your world's module settings

### Manifest URL
```
https://your-host/modules/shop-maker/module.json
```

## Usage

### Creating a Shop (GM Only)

1. Click the **Shop Maker** icon in the scene controls toolbar (store icon)
2. Click **Create New Shop** or use a preset template
3. Configure the shop:
   - **Name & Image**: Give your shop a name and select an image
   - **Item Types**: Select which types of items this shop carries
   - **Rarities**: Enable rarities and set max quantities per rarity
   - **Inventory**: Add items from compendiums or the world

### Shop Configuration Options

| Option | Description |
|--------|-------------|
| Item Types | Which categories of items the shop sells |
| Rarity Config | Enable/disable rarities with quantity limits |
| Price Modifier | Global price adjustment (1.0 = normal, 1.5 = 50% markup) |
| Currency | Which currency the shop uses |
| Sellback | Allow players to sell items back |

### Rarity Configuration

For each rarity level, you can configure:
- **Enabled**: Whether items of this rarity appear in the shop
- **Max Quantity**: Maximum stock for this rarity (-1 = unlimited, 0 = disabled)
- **Price Modifier**: Additional price adjustment for this rarity

### Populating from Compendiums

1. Open the shop configuration
2. Go to the **Inventory** tab
3. Select a compendium from the dropdown
4. Click **Populate** to add matching items based on your type/rarity settings

### Opening Shops for Players

1. Open the **Shop Browser** from the scene controls
2. Click the door icon to open a shop
3. Click the share icon to post a shop link in chat

### Player Shopping

Players can:
- Browse items with filtering and sorting
- See item prices and stock levels
- View item details by clicking the item name
- Purchase items (deducts currency, adds item to inventory)

## API

The module exposes a public API via `game.shopMaker`:

```javascript
// Create a new shop
const shop = await game.shopMaker.createShop({
  name: "My Shop",
  description: "A wonderful shop"
});

// Get a shop by ID
const shop = game.shopMaker.getShop(shopId);

// Get all shops
const shops = game.shopMaker.getAllShops();

// Open a shop for browsing
game.shopMaker.openShop(shopId);

// Open shop configuration
game.shopMaker.openShopConfig(shopId);

// Create from preset
await game.shopMaker.createFromPreset("blacksmith");

// Populate a shop from a compendium
await game.shopMaker.populateShop(shopId, "dnd5e.items", {
  itemTypes: ["weapon", "armor"],
  rarities: ["common", "uncommon"]
});
```

## Compatibility

- **Foundry VTT**: v11 - v12
- **Game Systems**: Designed for D&D 5e, but should work with any system that uses similar item/currency structures

## File Structure

```
shop-maker/
├── module.json           # Module manifest
├── scripts/
│   ├── module.js         # Main entry point
│   ├── api.js            # Public API
│   ├── constants.js      # Configuration constants
│   ├── apps/
│   │   ├── ShopConfig.js # Shop creation/editing
│   │   ├── ShopSheet.js  # Player shopping interface
│   │   └── ShopBrowser.js# Shop management browser
│   └── documents/
│       └── ShopDocument.js # Shop data model
├── templates/
│   ├── shop-config.hbs   # Config form template
│   ├── shop-sheet.hbs    # Shop interface template
│   ├── shop-browser.hbs  # Browser template
│   └── chat/
│       └── shop-card.hbs # Chat message template
├── styles/
│   └── shop-maker.css    # Module styles
└── lang/
    └── en.json           # English translations
```

## License

MIT License - Feel free to use and modify as needed.

