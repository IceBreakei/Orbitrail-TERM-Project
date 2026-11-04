import { createLuminousNovaWeapon, getLuminousNova } from './luminous-nova.js';
import { recordWeaponMax } from './weapon-max-order.js';
import { upgradeLevelLabel } from './upgrade-label.js';
import { luminousNovaSettings } from './game-config.js';
import { umbrellaUpgradeSettings, arisWeaponSettings, levelUpgradeSettings } from './game-config.js';
import { ensurePlayerStats } from './player-stats.js';
import { createArisWeapon, getArisWeapon } from './aris-weapon.js';
import { getUmbrella } from './weapon-progression.js';

const descriptions = {
  2: 'Increase damage by 30%.',
  3: 'Increase attack area by 20%.',
  4: 'Reduce time between attacks by 10%.',
  5: 'Increase damage by 30%.',
  6: 'Increase attack area by 20%.',
  7: 'Critical hits are guaranteed and deal 3x damage.'
};

/** Offer only the next upgrade for an equipped, implemented weapon. */
function umbrellaChoices(player) {
  ensurePlayerStats(player);
  const weapon = getUmbrella(player);
  if (!weapon) return [];
  const level = weapon.level || 1;
  if (level < umbrellaUpgradeSettings.maxLevel) return [{ id: 'umbrella-level',
    name: `Plana's Umbrella ${upgradeLevelLabel(weapon,umbrellaUpgradeSettings.maxLevel)}`, weapon, category: 'Weapon', description: descriptions[level + 1] }];
  return [];
}

const arisDescriptions = {
  2: 'Increase beam size by 30%.',
  3: 'Reduce attack cooldown by 0.5 seconds.',
  4: 'Increase damage by 50%.',
  5: 'Reduce attack cooldown by 0.5 seconds.',
  6: 'Increase beam size by 50%.',
  7: 'Fire an additional beam from behind.'
};

const luminousDescriptions={
  2:'Increase damage by 20%.',3:'Fire twice per base attack cycle.',4:'Increase damage by 30%.',
  5:'Fire three times per base attack cycle.',6:'Add knockback on hit.',7:'Fire four times per base attack cycle.'
};

/** Offer acquisition or the next Aris upgrade, plus existing umbrella choices. */
export function rollLevelUpgrades(player) {
  ensurePlayerStats(player);
  const choices = umbrellaChoices(player);
  // Fusion ingredients stay out of the upgrade pool while their synergy is equipped.
  const blocked=new Set((player.attackSlots||[]).filter(Boolean).flatMap(item=>
    item.consumedWeaponIds||(item.id==='princess-key'?['aris-laser','luminous-nova']:[])));
  const weapon = getArisWeapon(player);
  if (!blocked.has('aris-laser') && !weapon && (player.attackSlots || []).filter(Boolean).length < 6) choices.push({
    id: 'aris-new', name: "Supernova LV 1", weapon: createArisWeapon(), category: 'NEW Weapon',
    description: 'Shoot a powerful piercing laser beam every 3 seconds.'
  });
  else if (!blocked.has('aris-laser') && weapon && (weapon.level || 1) < arisWeaponSettings.maxLevel) choices.push({
    id: 'aris-level', name: `Supernova ${upgradeLevelLabel(weapon,arisWeaponSettings.maxLevel)}`, weapon, category: 'Weapon',
    description: arisDescriptions[(weapon.level || 1) + 1]
  });
  const luminous=getLuminousNova(player);
  if(!blocked.has('luminous-nova')&&!luminous&&(player.attackSlots||[]).filter(Boolean).length<6)choices.push({
    id:'luminous-new',name:'Luminous Nova LV 1',weapon:createLuminousNovaWeapon(),category:'NEW Weapon',
    description:'Fire a fast, piercing pink plasma round at a random target.'});
  else if(!blocked.has('luminous-nova')&&luminous&&(luminous.level||1)<luminousNovaSettings.maxLevel)choices.push({
    id:'luminous-level',name:`Luminous Nova ${upgradeLevelLabel(luminous,luminousNovaSettings.maxLevel)}`,weapon:luminous,category:'Weapon',
    description:luminousDescriptions[(luminous.level||1)+1]});
  // Synergies improve only through Crafter enhancements, never level-up choices.
  return choices.filter(choice=>!choice.weapon?.isSynergy).slice(0, levelUpgradeSettings.choices);
}

/** Advance one weapon level; awakening is available only through a Crafter. */
export function applyLevelUpgrade(player, id) {
  ensurePlayerStats(player);
  if (player.pendingUpgrades <= 0 || !rollLevelUpgrades(player).some(choice => choice.id === id)) return false;
  const weapon = id.startsWith('luminous-')?getLuminousNova(player):id.startsWith('aris-') ? getArisWeapon(player) : getUmbrella(player);
  if (id === 'aris-new'||id==='luminous-new') {
    player.attackSlots ??= [];
    const empty = player.attackSlots.findIndex(item => !item);
    const acquired=id==='luminous-new'?createLuminousNovaWeapon():createArisWeapon();
    if (empty >= 0) player.attackSlots[empty] = acquired;
    else player.attackSlots.push(acquired);
  } else if (id === 'aris-level') weapon.level = Math.min(arisWeaponSettings.maxLevel, (weapon.level || 1) + 1);
  else if(id==='luminous-level')weapon.level=Math.min(luminousNovaSettings.maxLevel,(weapon.level||1)+1);
  else if (id === 'umbrella-level') weapon.level = Math.min(umbrellaUpgradeSettings.maxLevel, (weapon.level || 1) + 1);
  else return false;
  recordWeaponMax(player,weapon);
  player.pendingUpgrades--;
  return true;
}
