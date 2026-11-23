/** Shop upgrade definitions, displayed in the upgrades browsing menu.
 * Gameplay effects and purchasing remain disabled pending their implementation.
 */
export const statUpgradeSettings = { enabled:false };
export const statUpgradeCatalog = [
  {
    "id": "max-hp-up",
    "name": "Max HP Up",
    "description": "Increase Max HP by 4% per level. (Max 40%)",
    "bonusPerRank": 4,
    "maxBonus": 40,
    "maxRank": 10,
    "unit": "percent",
    "costs": [
      200,
      500,
      1200,
      2750,
      6000,
      12000,
      18000,
      24000,
      30000,
      36000
    ],
    "totalCost": 130650
  },
  {
    "id": "atk-up",
    "name": "ATK Up",
    "description": "Increase all damage by 6% per level. (Max 60%)",
    "bonusPerRank": 6,
    "maxBonus": 60,
    "maxRank": 10,
    "unit": "percent",
    "costs": [
      300,
      750,
      1800,
      4100,
      9100,
      18000,
      25000,
      31000,
      37000,
      43000
    ],
    "totalCost": 170050
  },
  {
    "id": "spd-up",
    "name": "SPD Up",
    "description": "Increase movement speed by 6% per level. (Max 60%)",
    "bonusPerRank": 6,
    "maxBonus": 60,
    "maxRank": 10,
    "unit": "percent",
    "costs": [
      200,
      500,
      1200,
      2750,
      6000,
      12000,
      18000,
      24000,
      30000,
      36000
    ],
    "totalCost": 130650
  },
  {
    "id": "crit-up",
    "name": "Crit Up",
    "description": "Increase critical hit chance by 2% per level. (Max 10%)",
    "bonusPerRank": 2,
    "maxBonus": 10,
    "maxRank": 5,
    "unit": "percent",
    "costs": [
      300,
      750,
      1800,
      4100,
      9100
    ],
    "totalCost": 16050
  },
  {
    "id": "pick-up-range",
    "name": "Pick Up Range",
    "description": "Increase base pick up range by 10% per level. (Max 100%)",
    "bonusPerRank": 10,
    "maxBonus": 100,
    "maxRank": 10,
    "unit": "percent",
    "costs": [
      200,
      500,
      1200,
      2750,
      6000,
      12000,
      18000,
      24000,
      30000,
      36000
    ],
    "totalCost": 130650
  },
  {
    "id": "haste-up",
    "name": "Haste Up",
    "description": "Increase attack speed by 4% per level. (Max 20%)",
    "bonusPerRank": 4,
    "maxBonus": 20,
    "maxRank": 5,
    "unit": "percent",
    "costs": [
      400,
      1000,
      2400,
      5500,
      12000
    ],
    "totalCost": 21300
  },
  {
    "id": "regeneration",
    "name": "Regeneration",
    "description": "Slowly heals 1 HP every 5 seconds. +1 HP per level. (Max 5 HP / 5 seconds)",
    "bonusPerRank": 1,
    "maxBonus": 5,
    "maxRank": 5,
    "unit": "hp",
    "costs": [
      200,
      500,
      1200,
      2750,
      6000
    ],
    "totalCost": 10650,
    "intervalSeconds": 5
  },
  {
    "id": "defense-up",
    "name": "Defense Up",
    "description": "Increases defense, reducing damage taken by 3% per level. (Max 15%)",
    "bonusPerRank": 3,
    "maxBonus": 15,
    "maxRank": 5,
    "unit": "percent",
    "costs": [
      500,
      1250,
      3000,
      6900,
      15000
    ],
    "totalCost": 26650
  },
  {
    "id": "special-cooldown-reduction",
    "name": "Special Cooldown Reduction",
    "description": "Reduces the cooldown time of special attack by 3% per level. (Max 15%)",
    "bonusPerRank": 3,
    "maxBonus": 15,
    "maxRank": 5,
    "unit": "percent",
    "costs": [
      500,
      1250,
      3000,
      6900,
      15000
    ],
    "totalCost": 26650
  },
  {
    "id": "skill-up",
    "name": "Skill Up",
    "description": "Increase the damage of Skill attacks by 4% per level. (Max 40%)",
    "bonusPerRank": 4,
    "maxBonus": 40,
    "maxRank": 10,
    "unit": "percent",
    "costs": [
      500,
      1250,
      3000,
      6900,
      15000,
      20000,
      30000,
      40000,
      50000,
      60000
    ],
    "totalCost": 226650
  },
  {
    "id": "exp-gain-up",
    "name": "EXP Gain Up",
    "description": "Increases the amount of EXP gained by 4% per level. (Max 20%)",
    "bonusPerRank": 4,
    "maxBonus": 20,
    "maxRank": 5,
    "unit": "percent",
    "costs": [
      300,
      750,
      1800,
      4100,
      9100
    ],
    "totalCost": 16050
  },
  {
    "id": "food-drops-up",
    "name": "Food Drops Up",
    "description": "Increases the rate that food is dropped by 4% per level. (Max 20%)",
    "bonusPerRank": 4,
    "maxBonus": 20,
    "maxRank": 5,
    "unit": "percent",
    "costs": [
      150,
      375,
      900,
      2000,
      4500
    ],
    "totalCost": 7925
  },
  {
    "id": "credit-gain-up",
    "name": "Credit Gain Up",
    "description": "Increases the amount of Credits gained by 20% per level. (Max 200%)",
    "bonusPerRank": 20,
    "maxBonus": 200,
    "maxRank": 10,
    "unit": "percent",
    "costs": [
      400,
      1000,
      2400,
      5500,
      12000,
      20000,
      30000,
      40000,
      50000,
      60000
    ],
    "totalCost": 221300
  },
  {
    "id": "enhancement-rate-up",
    "name": "Enhancement Rate Up",
    "description": "Increases the chance of success during enhancements by 3% per level. (Max 15%)",
    "bonusPerRank": 3,
    "maxBonus": 15,
    "maxRank": 5,
    "unit": "percent",
    "costs": [
      300,
      750,
      1800,
      4100,
      9100
    ],
    "totalCost": 16050
  }
];
