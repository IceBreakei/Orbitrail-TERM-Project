/** Reserved ability/shop definitions only. Not imported into gameplay or purchase UI.
 * Await user directives before implementing purchases, persistence, unlock gates or controls.
 * Existing Development features (including Tuning) remain available as before.
 */
export const abilityUpgradeSettings = { enabled:false };
export const abilityUpgradeCatalog = [
  {id:'special-attack',name:'Special Attack',description:'Unlocks the Special Attack for all characters. Press the secondary button (default: X) to use.',costs:[500],totalCost:500},
  {id:'growth',name:'Growth',description:'Increase the damage of Character Main Weapons and Special Attacks by 1% per in-game level.',costs:[500,10000,50000],totalCost:60500},
  {id:'reroll',name:'Reroll',description:'Grants a use of Reroll when leveling up.',costs:[2500,5000,7500,10000,12500,15000,17500,20000,22500,25000],totalCost:137500},
  {id:'eliminate',name:'Eliminate',description:'Grants a use of Eliminate on options when leveling up.',costs:[2500,5000,7500,10000,12500,15000,17500,20000,22500,25000],totalCost:137500},
  {id:'tuning',name:'Tuning',description:'Unlocks the Tuning system. Tuning Pins may be dropped by targets which can modify the main weapon.',costs:[500],totalCost:500},
  {id:'hold',name:'Hold',description:'Grants a use of Hold on options when leveling up, which will guarantee an option to appear again next level.',costs:[5000,10000,15000,20000,25000],totalCost:75000},
  {id:'customize',name:'Customize',description:'Allows weapons and items to be disabled in the armory, and will not appear in game.',costs:[50000],totalCost:50000},
  {id:'supports',name:'Supports',description:'Unlocks the Support Items, allowing the use of support abilities chosen before a stage.',costs:[1000],totalCost:1000},
  {id:'momo-chats',name:'Momo Chats',description:'Unlocks Momochats. All student types can drop chat notifications, which grants permanent boosts.',costs:[50000],totalCost:50000},
  {id:'enchantments',name:'Enchantments',description:'Unlock Weapon Enchantments. General weapons may gain enchantments.',costs:[1000],totalCost:1000},
  {id:'student-council',name:'Student Council',description:'Unlocks the Student Council, where characters gain bonuses based on accomplishments. Check the Achievements Menu for more info!',costs:[2000],totalCost:2000}
];
