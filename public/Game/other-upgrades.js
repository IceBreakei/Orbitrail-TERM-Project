/** Shop upgrade definitions, displayed in the upgrades browsing menu.
 * Gameplay effects and purchasing remain disabled pending their implementation.
 */
export const otherUpgradeSettings = { enabled:false };
export const otherUpgradeCatalog = [
  {
    "id": "customer-service",
    "name": "Customer Service",
    "description": "Increase the number of mob spawns by 1 per level. This will increase the difficulty of the game.",
    "costs": [
      2000,
      4000,
      6000,
      8000,
      10000
    ],
    "totalCost": 30000,
    "maxRank": 5,
    "additionalMobSpawnsPerRank": 1
  },
  {
    "id": "weapon-limit",
    "name": "Weapon Limit",
    "description": "Limit the max number of weapons that may be gained in a game. (From 5 down to 0.)",
    "costs": [
      0,
      0,
      0,
      0,
      0
    ],
    "totalCost": 0,
    "maxRank": 5,
    "additionalWeaponLimitsByRank": [
      5,
      4,
      3,
      2,
      1,
      0
    ],
    "startingWeaponExcluded": true
  },
  {
    "id": "item-limit",
    "name": "Item Limit",
    "description": "Limit the max number of items/equipment that may be gained in a game. (From 6 down to 0.)",
    "costs": [
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "totalCost": 0,
    "maxRank": 6,
    "itemLimitsByRank": [
      6,
      5,
      4,
      3,
      2,
      1,
      0
    ]
  },
  {
    "id": "synnergy-ban",
    "name": "Synnergy Ban",
    "description": "No Synnergy Weapons can be created.",
    "costs": [
      0
    ],
    "totalCost": 0,
    "maxRank": 1
  },
  {
    "id": "supers-ban",
    "name": "Supers Ban",
    "description": "Super Items will not drop.",
    "costs": [
      0
    ],
    "totalCost": 0,
    "maxRank": 1
  },
  {
    "id": "hardcore",
    "name": "Hardcore",
    "description": "Ultimate challenge! HP is set to 1. Gain massive bonus score the longer you survive!",
    "costs": [
      0
    ],
    "totalCost": 0,
    "maxRank": 1,
    "hp": 1
  },
  {
    "id": "refund-all",
    "name": "Refund All",
    "description": "Refunds all purchases in the shop.",
    "costs": [
      0
    ],
    "totalCost": 0,
    "kind": "action"
  }
];
