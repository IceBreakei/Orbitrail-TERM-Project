import { createWakamoBayonetWeapon, wakamoBayonetDescriptions } from './game-config.js';
import { createCheeringBalloonsWeapon, cheeringBalloonsDescriptions } from './game-config.js';
import { createMaidForceWeapon, maidForceDescriptions } from './game-config.js';
import { createTimeToSurfWeapon, timeToSurfDescriptions } from './game-config.js';
import { createServeWeapon, serveDescriptions } from './game-config.js';
import { createOrbitalCompassWeapon, orbitalCompassDescriptions } from './game-config.js';
import { createMoustacheMedalWeapon, moustacheMedalDescriptions } from './game-config.js';
import { createStudentHandbookWeapon, studentHandbookDescriptions } from './game-config.js';
import { createThrowingCardsWeapon, throwingCardsDescriptions } from './game-config.js';
import { characterSkillChoices, applyCharacterSkillUpgrade } from './game-config.js';
import { createBeanBagBombWeapon, beanBagBombDescriptions } from './game-config.js';
import { createWaterDousingWeapon, waterDousingDescriptions } from './game-config.js';
import { createSaintPredatorWeapon, saintPredatorDescriptions } from './game-config.js';
import { createMolotovWeapon, molotovDescriptions } from './game-config.js';
import { createBadCookingWeapon, badCookingDescriptions } from './game-config.js';
import { itemUpgradeChoices, applyItemUpgrade, isContentUnlocked } from './item-catalog.js';
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
export function rollLevelUpgrades(player, {all=false}={}) {
  ensurePlayerStats(player);
  const choices = [...umbrellaChoices(player),...characterSkillChoices(player)];
  // Fusion ingredients stay out of the upgrade pool while their synergy is equipped.
  const blocked=new Set((player.attackSlots||[]).filter(Boolean).flatMap(item=>
    item.consumedWeaponIds||(item.id==='princess-key'?['aris-laser','luminous-nova']:[])));
  const weapon = getArisWeapon(player);
  if (!blocked.has('aris-laser') && !weapon && isContentUnlocked('aris-laser') && (player.attackSlots || []).filter(Boolean).length < (player.maxWeaponSlots??6)) choices.push({
    id: 'aris-new', name: "Supernova LV 1", weapon: createArisWeapon(), category: 'NEW Weapon',
    description: 'Shoot a powerful piercing laser beam every 3 seconds.'
  });
  else if (!blocked.has('aris-laser') && weapon && (weapon.level || 1) < arisWeaponSettings.maxLevel) choices.push({
    id: 'aris-level', name: `Supernova ${upgradeLevelLabel(weapon,arisWeaponSettings.maxLevel)}`, weapon, category: 'Weapon',
    description: arisDescriptions[(weapon.level || 1) + 1]
  });
  const luminous=getLuminousNova(player);
  if(!blocked.has('luminous-nova')&&!luminous&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({
    id:'luminous-new',name:'Luminous Nova LV 1',weapon:createLuminousNovaWeapon(),category:'NEW Weapon',
    description:'Fire a fast, piercing pink plasma round at a random target.'});
  else if(!blocked.has('luminous-nova')&&luminous&&(luminous.level||1)<luminousNovaSettings.maxLevel)choices.push({
    id:'luminous-level',name:`Luminous Nova ${upgradeLevelLabel(luminous,luminousNovaSettings.maxLevel)}`,weapon:luminous,category:'Weapon',
    description:luminousDescriptions[(luminous.level||1)+1]});
  const cooking=player.attackSlots?.find(w=>w?.id==='bad-cooking');
  if(!blocked.has('bad-cooking')&&!player.disabledWeaponIds?.includes('bad-cooking')){
    if(!cooking&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'cooking-new',name:'Bad Cooking LV 1',weapon:createBadCookingWeapon(),category:'NEW Weapon',description:badCookingDescriptions[1]});
    else if(cooking&&(cooking.level||1)<7)choices.push({id:'cooking-level',name:`Bad Cooking ${upgradeLevelLabel(cooking,7)}`,weapon:cooking,category:'Weapon',description:badCookingDescriptions[(cooking.level||1)+1]});
  }
  const molotov=player.attackSlots?.find(w=>w?.id==='molotov-cocktail');
  if(!blocked.has('molotov-cocktail')&&!player.disabledWeaponIds?.includes('molotov-cocktail')){
    if(!molotov&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'molotov-new',name:'Molotov Cocktail LV 1',weapon:createMolotovWeapon(),category:'NEW Weapon',description:molotovDescriptions[1]});
    else if(molotov&&(molotov.level||1)<7)choices.push({id:'molotov-level',name:`Molotov Cocktail ${upgradeLevelLabel(molotov,7)}`,weapon:molotov,category:'Weapon',description:molotovDescriptions[(molotov.level||1)+1]});
  }
  const saint=player.attackSlots?.find(w=>w?.id==='saint-predator');
  if(!blocked.has('saint-predator')&&!player.disabledWeaponIds?.includes('saint-predator')){
    if(!saint&&isContentUnlocked('saint-predator')&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'saint-new',name:'Saint Predator LV 1',weapon:createSaintPredatorWeapon(),category:'NEW Weapon',description:saintPredatorDescriptions[1]});
    else if(saint&&(saint.level||1)<7)choices.push({id:'saint-level',name:`Saint Predator ${upgradeLevelLabel(saint,7)}`,weapon:saint,category:'Weapon',description:saintPredatorDescriptions[(saint.level||1)+1]});
  }
  const water=player.attackSlots?.find(w=>w?.id==='water-dousing');
  if(!blocked.has('water-dousing')&&!player.disabledWeaponIds?.includes('water-dousing')){
    if(!water&&isContentUnlocked('water-dousing')&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'water-new',name:'Splash! LV 1',weapon:createWaterDousingWeapon(),category:'NEW Weapon',description:waterDousingDescriptions[1]});
    else if(water&&(water.level||1)<7)choices.push({id:'water-level',name:`Splash! ${upgradeLevelLabel(water,7)}`,weapon:water,category:'Weapon',description:waterDousingDescriptions[(water.level||1)+1]});
  }
  const bean=player.attackSlots?.find(w=>w?.id==='bean-bag-bomb');
  if(!blocked.has('bean-bag-bomb')&&!player.disabledWeaponIds?.includes('bean-bag-bomb')){
    if(!bean&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'bean-new',name:'Bean Bag Bomb LV 1',weapon:createBeanBagBombWeapon(),category:'NEW Weapon',description:beanBagBombDescriptions[1]});
    else if(bean&&(bean.level||1)<7)choices.push({id:'bean-level',name:`Bean Bag Bomb ${upgradeLevelLabel(bean,7)}`,weapon:bean,category:'Weapon',description:beanBagBombDescriptions[(bean.level||1)+1]});
  }
  const cards=player.attackSlots?.find(w=>w?.id==='throwing-cards');
  if(!blocked.has('throwing-cards')&&!player.disabledWeaponIds?.includes('throwing-cards')){
    if(!cards&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'cards-new',name:'Throwing Cards LV 1',weapon:createThrowingCardsWeapon(),category:'NEW Weapon',description:throwingCardsDescriptions[1]});
    else if(cards&&(cards.level||1)<7)choices.push({id:'cards-level',name:`Throwing Cards ${upgradeLevelLabel(cards,7)}`,weapon:cards,category:'Weapon',description:throwingCardsDescriptions[(cards.level||1)+1]});
  }
  const handbook=player.attackSlots?.find(w=>w?.id==='student-handbook');
  if(!blocked.has('student-handbook')&&!player.disabledWeaponIds?.includes('student-handbook')){
    if(!handbook&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'handbook-new',name:'Student Handbook LV 1',weapon:createStudentHandbookWeapon(),category:'NEW Weapon',description:studentHandbookDescriptions[1]});
    else if(handbook&&(handbook.level||1)<7)choices.push({id:'handbook-level',name:`Student Handbook ${upgradeLevelLabel(handbook,7)}`,weapon:handbook,category:'Weapon',description:studentHandbookDescriptions[(handbook.level||1)+1]});
  }
  const medal=player.attackSlots?.find(w=>w?.id==='moustache-medal');
  if(!blocked.has('moustache-medal')&&!player.disabledWeaponIds?.includes('moustache-medal')){
    if(!medal&&isContentUnlocked('moustache-medal')&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'medal-new',name:'Moustache Medal LV 1',weapon:createMoustacheMedalWeapon(),category:'NEW Weapon',description:moustacheMedalDescriptions[1]});
    else if(medal&&(medal.level||1)<7)choices.push({id:'medal-level',name:`Moustache Medal ${upgradeLevelLabel(medal,7)}`,weapon:medal,category:'Weapon',description:moustacheMedalDescriptions[(medal.level||1)+1]});
  }
  const compass=player.attackSlots?.find(w=>w?.id==='orbital-compass');
  if(!blocked.has('orbital-compass')&&!player.disabledWeaponIds?.includes('orbital-compass')){
    if(!compass&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'compass-new',name:'Orbital Compass LV 1',weapon:createOrbitalCompassWeapon(),category:'NEW Weapon',description:orbitalCompassDescriptions[1]});
    else if(compass&&(compass.level||1)<7)choices.push({id:'compass-level',name:`Orbital Compass ${upgradeLevelLabel(compass,7)}`,weapon:compass,category:'Weapon',description:orbitalCompassDescriptions[(compass.level||1)+1]});
  }
  const serve=player.attackSlots?.find(w=>w?.id==='serve');
  if(!blocked.has('serve')&&!player.disabledWeaponIds?.includes('serve')){
    if(!serve&&isContentUnlocked('serve')&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'serve-new',name:'Serve! LV 1',weapon:createServeWeapon(),category:'NEW Weapon',description:serveDescriptions[1]});
    else if(serve&&(serve.level||1)<7)choices.push({id:'serve-level',name:`Serve! ${upgradeLevelLabel(serve,7)}`,weapon:serve,category:'Weapon',description:serveDescriptions[(serve.level||1)+1]});
  }
  const surf=player.attackSlots?.find(w=>w?.id==='time-to-surf');
  if(!blocked.has('time-to-surf')&&!player.disabledWeaponIds?.includes('time-to-surf')){
    if(!surf&&isContentUnlocked('time-to-surf')&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'surf-new',name:'Time to Surf LV 1',weapon:createTimeToSurfWeapon(),category:'NEW Weapon',description:timeToSurfDescriptions[1]});
    else if(surf&&(surf.level||1)<7)choices.push({id:'surf-level',name:`Time to Surf ${upgradeLevelLabel(surf,7)}`,weapon:surf,category:'Weapon',description:timeToSurfDescriptions[(surf.level||1)+1]});
  }
  const maid=player.attackSlots?.find(w=>w?.id==='maid-force');
  if(!blocked.has('maid-force')&&!player.disabledWeaponIds?.includes('maid-force')){
    if(!maid&&isContentUnlocked('maid-force')&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'maid-new',name:'Maid Force LV 1',weapon:createMaidForceWeapon(),category:'NEW Weapon',description:maidForceDescriptions[1]});
    else if(maid&&(maid.level||1)<7)choices.push({id:'maid-level',name:`Maid Force ${upgradeLevelLabel(maid,7)}`,weapon:maid,category:'Weapon',description:maidForceDescriptions[(maid.level||1)+1]});
  }
  const balloons=player.attackSlots?.find(w=>w?.id==='cheering-balloons');
  if(!blocked.has('cheering-balloons')&&!player.disabledWeaponIds?.includes('cheering-balloons')){
    if(!balloons&&isContentUnlocked('cheering-balloons')&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'balloons-new',name:'Cheering Balloons LV 1',weapon:createCheeringBalloonsWeapon(),category:'NEW Weapon',description:cheeringBalloonsDescriptions[1]});
    else if(balloons&&(balloons.level||1)<7)choices.push({id:'balloons-level',name:`Cheering Balloons ${upgradeLevelLabel(balloons,7)}`,weapon:balloons,category:'Weapon',description:cheeringBalloonsDescriptions[(balloons.level||1)+1]});
  }
  const bayonet=player.attackSlots?.find(w=>w?.id==='wakamo-bayonet');
  if(!blocked.has('wakamo-bayonet')&&!player.disabledWeaponIds?.includes('wakamo-bayonet')){
    if(!bayonet&&isContentUnlocked('wakamo-bayonet')&&(player.attackSlots||[]).filter(Boolean).length<(player.maxWeaponSlots??6))choices.push({id:'bayonet-new',name:"Wakamo's Bayonet LV 1",weapon:createWakamoBayonetWeapon(),category:'NEW Weapon',description:wakamoBayonetDescriptions[1]});
    else if(bayonet&&(bayonet.level||1)<7)choices.push({id:'bayonet-level',name:`Wakamo's Bayonet ${upgradeLevelLabel(bayonet,7)}`,weapon:bayonet,category:'Weapon',description:wakamoBayonetDescriptions[(bayonet.level||1)+1]});
  }
  // Synergies improve only through Crafter enhancements, never level-up choices.
  choices.push(...itemUpgradeChoices(player));
  return choices.filter(choice=>!(choice.weapon&&player.disabledWeaponIds?.includes(choice.weapon.id))&&!choice.weapon?.isSynergy&&!player.eliminatedUpgradeIds?.includes(choice.weapon?.id||choice.id)).slice(0, all?Infinity:levelUpgradeSettings.choices);
}

/** Advance one weapon level; awakening is available only through a Crafter. */
export function applyLevelUpgrade(player, id) {
  ensurePlayerStats(player);
  if (player.pendingUpgrades <= 0 || !rollLevelUpgrades(player,{all:true}).some(choice => choice.id === id)) return false;
  if(id.startsWith('phrenapates-')||id.startsWith('celestia-')||id.startsWith('swipe-')){if(!applyCharacterSkillUpgrade(player,id))return false;player.pendingUpgrades--;return true;}
  if(id==='bayonet-new'||id==='bayonet-level'){
    player.attackSlots??=[];
    if(id==='bayonet-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createWakamoBayonetWeapon();else player.attackSlots.push(createWakamoBayonetWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='wakamo-bayonet');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='balloons-new'||id==='balloons-level'){
    player.attackSlots??=[];
    if(id==='balloons-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createCheeringBalloonsWeapon();else player.attackSlots.push(createCheeringBalloonsWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='cheering-balloons');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='maid-new'||id==='maid-level'){
    player.attackSlots??=[];
    if(id==='maid-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createMaidForceWeapon();else player.attackSlots.push(createMaidForceWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='maid-force');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='surf-new'||id==='surf-level'){
    player.attackSlots??=[];
    if(id==='surf-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createTimeToSurfWeapon();else player.attackSlots.push(createTimeToSurfWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='time-to-surf');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='serve-new'||id==='serve-level'){
    player.attackSlots??=[];
    if(id==='serve-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createServeWeapon();else player.attackSlots.push(createServeWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='serve');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='compass-new'||id==='compass-level'){
    player.attackSlots??=[];
    if(id==='compass-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createOrbitalCompassWeapon();else player.attackSlots.push(createOrbitalCompassWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='orbital-compass');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='medal-new' ||id==='medal-level'){
    player.attackSlots??=[];
    if(id==='medal-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createMoustacheMedalWeapon();else player.attackSlots.push(createMoustacheMedalWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='moustache-medal');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='handbook-new' ||id==='handbook-level'){
    player.attackSlots??=[];
    if(id==='handbook-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createStudentHandbookWeapon();else player.attackSlots.push(createStudentHandbookWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='student-handbook');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='cards-new' ||id==='cards-level'){
    player.attackSlots??=[];
    if(id==='cards-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createThrowingCardsWeapon();else player.attackSlots.push(createThrowingCardsWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='throwing-cards');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='bean-new' ||id==='bean-level'){
    player.attackSlots??=[];
    if(id==='bean-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createBeanBagBombWeapon();else player.attackSlots.push(createBeanBagBombWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='bean-bag-bomb');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='water-new' ||id==='water-level'){
    player.attackSlots??=[];
    if(id==='water-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createWaterDousingWeapon();else player.attackSlots.push(createWaterDousingWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='water-dousing');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='saint-new'||id==='saint-level'){
    player.attackSlots??=[];
    if(id==='saint-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createSaintPredatorWeapon();else player.attackSlots.push(createSaintPredatorWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='saint-predator');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='molotov-new'||id==='molotov-level'){
    player.attackSlots??=[];
    if(id==='molotov-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createMolotovWeapon();else player.attackSlots.push(createMolotovWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='molotov-cocktail');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id==='cooking-new'||id==='cooking-level'){
    player.attackSlots??=[];
    if(id==='cooking-new'){const empty=player.attackSlots.findIndex(w=>!w);if(empty>=0)player.attackSlots[empty]=createBadCookingWeapon();else player.attackSlots.push(createBadCookingWeapon());}
    else {const w=player.attackSlots.find(w=>w?.id==='bad-cooking');w.level++;recordWeaponMax(player,w);}
    player.pendingUpgrades--;return true;
  }
  if(id.startsWith('sports-')||id.startsWith('malkuth-')||id.startsWith('racer-')||id.startsWith('helmet-')||id.startsWith('jacket-')||id.startsWith('chise-')||id.startsWith('overclock-')||id.startsWith('pharmaceuticals-')) {if(!applyItemUpgrade(player,id))return false;player.pendingUpgrades--;return true;}
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
