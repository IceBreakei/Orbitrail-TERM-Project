/** Equipment definitions and account-local content unlocks. Guest unlocks stay in memory. */
let itemUnlockStore=null,itemUnlockKey=null;
const unlockedItems=new Set();
let developerUnlocks=false,simulateAccount=false;
const simulatedUnlocks=new Set();
/** Developer bypass never writes unlocks; simulation is a separate fresh test profile. */
export function setUnlockSimulation(enabled){
  const next=developerUnlocks&&Boolean(enabled);
  if(next&&!simulateAccount)simulatedUnlocks.clear();
  simulateAccount=next;
}
export function isUnlockSimulation(){return simulateAccount;}
export function isContentUnlocked(id,defaultUnlocked=false){
  return (developerUnlocks&&!simulateAccount)||defaultUnlocked||(simulateAccount?simulatedUnlocks:unlockedItems).has(id);
}
export function unlockContent(id){
  if(simulateAccount){simulatedUnlocks.add(id);return;}
  unlockedItems.add(id);
  try {itemUnlockStore?.setItem(itemUnlockKey,JSON.stringify([...unlockedItems]));} catch {}
}
/** Called only for actual boss defeats; normal enemies cannot satisfy this objective. */
export function unlockStageBossRewards(stage,bossType){
  if(stage===1&&bossType==='shiroko')unlockContent('saint-predator');
  if(stage===2&&bossType==='arisu')unlockContent('aris-laser');
  if(stage===3&&bossType==='iroha')unlockContent('maid-force');
  if(stage===4&&bossType==='neru')unlockContent('wakamo-bayonet');
}
export function configureItemUnlocks(storage,uid,{developer=false}={}) {
  developerUnlocks=Boolean(uid&&developer);simulateAccount=false;simulatedUnlocks.clear();
  itemUnlockStore=uid?storage:null;itemUnlockKey=uid?`orbitrail.items.${uid}`:null;unlockedItems.clear();
  try {for(const id of JSON.parse(itemUnlockStore?.getItem(itemUnlockKey)||'[]'))unlockedItems.add(id);} catch {}
}
export function unlockItem(id){unlockContent(id);}
export function isItemUnlocked(id){return isContentUnlocked(id);}
/** Unlocks are permanent eligibility; future Customize selections separately filter rewards. */
export function isItemRewardEnabled(player,id) {
  if(player.attackSlots?.some(w=>w?.consumedItemIds?.includes(id)))return false;
  const disabled=player.disabledItemIds;
  return !(disabled instanceof Set?disabled.has(id):Array.isArray(disabled)&&disabled.includes(id));
}
export function createMalkuthHat(awakened=false) {
  return {id:'malkuth-hat',name:"Malkuth's Hat",icon:'../sprites/items/malkuth.png',iconFit:true,iconCrop:{x:0,y:19,width:1254,height:1235},level:1,maxLevel:awakened?1:3,awakened,isSuper:awakened};
}
export function malkuthDescription(item) {
  return item.awakened?'Attack damage is multiplied by 1.5.':`Attack damage is multiplied by ${[1.2,1.3,1.4][Math.min(2,Math.max(0,(item.level||1)-1))]}, but lose 20% critical chance.`;
}
export function itemDamageBonus(player) {
  const hat=player.equipmentSlots?.find(item=>item?.id==='malkuth-hat');
  const superBonus=player.attackSlots?.some(w=>w?.id==='decagrammaton') ? .3 : 0;
  return superBonus+(hat?(hat.awakened?1.5:[1.2,1.3,1.4][Math.min(2,Math.max(0,(hat.level||1)-1))]):1);
}
export function itemCritPenalty(player) {
  const hat=player.equipmentSlots?.find(item=>item?.id==='malkuth-hat');
  // Reserved capability for a future MAX-rank penalty-negation item.
  const negate=player.equipmentSlots?.some(item=>item?.negatesItemPenalties&&Number.isFinite(item.maxLevel)&&item.level>=item.maxLevel);
  return hat&&!hat.awakened&&!negate?20*itemPenaltyMultiplier(player):0;
}
function malkuthUpgradeChoices(player) {
  if(!isItemRewardEnabled(player,'malkuth-hat'))return [];
  const slots=player.equipmentSlots||[],hat=slots.find(item=>item?.id==='malkuth-hat');
  if(hat){if(hat.awakened||hat.level>=3)return [];
    return [{id:'malkuth-level',name:`Malkuth's Hat LV ${hat.level||1} -> ${(hat.level||1)+1===3?'MAX':`LV ${(hat.level||1)+1}`}`,weapon:hat,category:'Item',description:malkuthDescription({...hat,level:(hat.level||1)+1})}];}
  if(!isItemUnlocked('malkuth-hat')||slots.filter(Boolean).length>=6)return [];
  const item=createMalkuthHat();return [{id:'malkuth-new',name:"Malkuth's Hat LV 1",weapon:item,category:'NEW Item',description:malkuthDescription(item)}];
}
export function createRacerPass(superItem=false){return {id:'racer-pass',name:'Racer Pass',icon:'../sprites/items/Racer Pass.png',iconFit:true,iconCrop:{x:43,y:12,width:214,height:220},level:1,maxLevel:superItem?1:3,
  isSuper:superItem,awakened:superItem,itemType:'Stat',weight:1,defaultUnlocked:true};}
export function racerPassDescription(item){const index=Math.min(2,Math.max(0,(item.level||1)-1));
 return item.isSuper?'Increase attack size and knockback effects by 30%. Increase Pick Up Range by 100% and Max HP by 20.':
 `Increase attack size and knockback effects by ${[10,15,20][index]}%. Increase Pick Up Range by ${[30,40,50][index]}%.`;}
export function createSafetyHelmet(superItem=false){return {id:'safety-helmet',name:'Safety Helmet',icon:'../sprites/items/Safety Helmet.png',iconFit:true,iconCrop:{x:31,y:42,width:231,height:166},
 level:1,maxLevel:superItem?1:5,isSuper:superItem,awakened:superItem,itemType:'Utility',weight:4,defaultUnlocked:true};}
export function safetyHelmetStats(player){const item=player.equipmentSlots?.find(i=>i?.id==='safety-helmet');
 if(!item)return {chance:0,super:false};const superItem=Boolean(item.isSuper||item.awakened);
 return {chance:superItem ? .4 : [.15,.2,.25,.3,.35][Math.min(4,Math.max(0,(item.level||1)-1))],super:superItem};}
export function safetyHelmetDescription(item){const stats=safetyHelmetStats({equipmentSlots:[item]});
 return `${Math.round(stats.chance*100)}% chance to negate 1 hit${stats.super?' and heal 10% Max HP':''}, and create a shockwave that knocks back all targets.`;}
export function createLifeJacket(superItem=false){return {id:'life-jacket',name:'Life Jacket',icon:'../sprites/items/Life Jacket.png',
 iconFit:true,iconCrop:{x:42,y:13,width:212,height:219},level:1,maxLevel:superItem?1:5,isSuper:superItem,awakened:superItem,itemType:'Utility',weight:3,defaultUnlocked:true};}
export function lifeJacketStats(player){const item=player.equipmentSlots?.find(i=>i?.id==='life-jacket');if(!item)return null;
 const superItem=Boolean(item.isSuper||item.awakened);return {capacity:superItem?40:15+5*Math.min(4,Math.max(0,(item.level||1)-1)),reduction:superItem?15:10,super:superItem};}
export function lifeJacketDescription(item){const stats=lifeJacketStats({equipmentSlots:[item]});return `Gain a shield that absorbs up to ${stats.capacity} damage. Every 15 seconds, this shield refreshes. Also reduces damage taken by ${stats.reduction}%.${stats.super?' When shield is full, heal 10 HP every 3 seconds.':''}`;}
export function syncLifeJacketShield(player){const stats=lifeJacketStats(player);
 if(!stats){delete player.lifeJacketState;return;}
 const key=`${stats.capacity}:${stats.super}`;
 if(player.lifeJacketState?.key!==key)player.lifeJacketState={key,capacity:stats.capacity,remaining:stats.capacity,refreshElapsed:0,healElapsed:0};
}
export function totalPlayerShield(player){return Math.max(0,player.shield||0)+Math.max(0,player.lifeJacketState?.remaining||0);}
export function createChisePlushie(){return {id:'chise-plushie',name:'Chise Plushie',icon:'../sprites/items/Chise-nyan Doll.png',
 iconFit:true,iconCrop:{x:57,y:13,width:195,height:225},level:1,maxLevel:3,itemType:'Utility',weight:3,defaultUnlocked:false,
 unlockObjective:'Survive for 10 minutes as Arona in a single run'};}
export function chiseImmediateFraction(player){const item=player.equipmentSlots?.find(i=>i?.id==='chise-plushie');return item?[.3,.2,.1][Math.min(2,Math.max(0,(item.level||1)-1))]:1;}
export function chisePlushieDescription(item){const fraction=chiseImmediateFraction({equipmentSlots:[item]});return `Delay taken damage. On any hit by a target, take only ${Math.round(fraction*100)}% of the damage initially, then take the remaining damage gradually.`;}
export function createSpecialPharmaceuticals(){return {id:'special-pharmaceuticals',name:'Special Pharmaceuticals',icon:'../sprites/items/Special Pharmaceuticals.png',iconFit:true,level:1,maxLevel:3,itemType:'Utility',weight:1,defaultUnlocked:false,unlockObjective:'Survive for 10 minutes as Plana in a single run'};}
export function itemPenaltyMultiplier(player){const item=player.equipmentSlots?.find(i=>i?.id==='special-pharmaceuticals');return item?[.67,.34,0][Math.min(2,Math.max(0,(item.level||1)-1))]:1;}
export function specialPharmaceuticalsDescription(item){const reduction=[33,66,100][Math.min(2,Math.max(0,(item.level||1)-1))];return reduction===100?'Negate any negative effects of items placed on the player.':`Reduce the negative effects of any items placed on the player by ${reduction}%.`;}
export function createOverheatedOverclocking(superItem=false){return {id:'overheated-overclocking',name:'Overheated Overclocking',icon:'../sprites/items/Gate Unlock Code.png',
 iconFit:true,iconCrop:{x:42,y:24,width:234,height:204},level:1,maxLevel:superItem?1:3,isSuper:superItem,awakened:superItem,itemType:'Stat',weight:2,defaultUnlocked:false,
 unlockObjective:"It's Safe I Swear: Complete a stage using Luminous Nova"};}
export function overclockingStats(player){const item=player.equipmentSlots?.find(i=>i?.id==='overheated-overclocking');if(!item)return {atk:0,skillDamage:0,drainPercent:0};
 const superItem=Boolean(item.isSuper||item.awakened);return {atk:superItem?100:[40,60,80][Math.min(2,Math.max(0,(item.level||1)-1))],skillDamage:superItem?200:0,drainPercent:superItem?0:5*itemPenaltyMultiplier(player)};}
export function overclockingDescription(item){const stats=overclockingStats({equipmentSlots:[item]});return stats.skillDamage?'Gain 100% ATK. Also gain 200% Skill Damage.':`Lose 5% Max HP every second (until 1 HP remains), but gain ${stats.atk}% ATK.`;}
export function itemSkillDamageMultiplier(player){return Math.max(0,1+(overclockingStats(player).skillDamage+(Number(player.skillDamageBonusPercent)||0))/100);}
export function itemHpDrainNegated(player){return player.equipmentSlots?.some(item=>item&&(item.negatesItemPenalties||item.negatesItemHpDrain)&&Number.isFinite(item.maxLevel)&&item.level>=item.maxLevel)||false;}
export function unlockStageClearRewards(player){
 if(player.equipmentSlots?.some(i=>i?.id==='sports-drink')){unlockContent('achievement:soaking');unlockContent('water-dousing');}
 if(!player.attackSlots?.some(w=>w?.id==='luminous-nova'))return false;
 unlockContent('achievement:its-safe-i-swear');unlockContent('overheated-overclocking');return true;
}
export function itemUpgradeChoices(player){
 const choices=malkuthUpgradeChoices(player),slots=player.equipmentSlots||[];
 for(const [id,prefix,create,describe,max] of [['sports-drink','sports',createSportsDrink,sportsDrinkDescription,3],['racer-pass','racer',createRacerPass,racerPassDescription,3],['safety-helmet','helmet',createSafetyHelmet,safetyHelmetDescription,5],['life-jacket','jacket',createLifeJacket,lifeJacketDescription,5],['chise-plushie','chise',createChisePlushie,chisePlushieDescription,3],['overheated-overclocking','overclock',createOverheatedOverclocking,overclockingDescription,3],['special-pharmaceuticals','pharmaceuticals',createSpecialPharmaceuticals,specialPharmaceuticalsDescription,3]]){
  if(!isItemRewardEnabled(player,id))continue;const item=slots.find(i=>i?.id===id);
  if(['chise-plushie','overheated-overclocking','special-pharmaceuticals'].includes(id)&&!item&&!isContentUnlocked(id))continue;
  if(item&&!item.isSuper&&!item.awakened&&(item.level||1)<max)choices.push({id:`${prefix}-level`,name:`${item.name} LV ${item.level||1} -> ${(item.level||1)+1===max?'MAX':`LV ${(item.level||1)+1}`}`,
    weapon:item,category:'Item',description:describe({...item,level:(item.level||1)+1})});
  else if(!item&&slots.filter(Boolean).length<6){const weapon=create();choices.push({id:`${prefix}-new`,name:`${weapon.name} LV 1`,weapon,category:'NEW Item',description:describe(weapon)});}
 }
 return choices;
}
/** Reconcile flat Super HP exactly once, including upgrades, swaps and removal. */
export function syncRacerPassHealth(player){
 const bonus=player.equipmentSlots?.some(i=>i?.id==='racer-pass'&&(i.isSuper||i.awakened))?20:0;
 if(!Number.isFinite(player.maxHp))return;
 const difference=bonus-(player.racerPassHpApplied||0);player.racerPassHpApplied=bonus;
 if(difference){player.maxHp+=difference;player.hp=Math.min(player.maxHp,Math.max(0,(player.hp??player.maxHp)+Math.max(0,difference)));}
}
export function applyItemUpgrade(player,id) {
  const choice=itemUpgradeChoices(player).find(choice=>choice.id===id);if(!choice)return false;
  if(id==='sports-level'||id==='malkuth-level'||id==='racer-level'||id==='helmet-level'||id==='jacket-level'||id==='chise-level'||id==='overclock-level'||id==='pharmaceuticals-level')choice.weapon.level++;
  else {const slots=player.equipmentSlots??=[],empty=slots.findIndex(item=>!item);if(empty>=0)slots[empty]=choice.weapon;else slots.push(choice.weapon);}
  return true;
}

export function createSportsDrink(superItem=false){return {id:'sports-drink',name:'Sports Drink',icon:'../sprites/items/Sports Drink.png',iconFit:true,iconCrop:{x:57,y:14,width:179,height:223},level:1,maxLevel:superItem?1:3,isSuper:superItem,awakened:superItem,itemType:'Stat',weight:4,defaultUnlocked:true};}
export function sportsDrinkDescription(item){return item.isSuper||item.awakened?'Gain 30% crit, but your aiming direction becomes slightly unstable.':`Gain 1% crit every second up to ${[10,15,20][Math.min(2,Math.max(0,(item.level||1)-1))]}%. Enemy-hit HP damage halves the accumulated buff. Eating food grants +5% crit for 10 seconds.`;}
export function sportsDrinkCritBonus(player){const item=player.equipmentSlots?.find(i=>i?.id==='sports-drink');if(!item)return 0;if(item.isSuper||item.awakened)return 30;return Math.min([10,15,20][Math.min(2,Math.max(0,(item.level||1)-1))],player.sportsDrinkState?.crit||0)+(player.sportsDrinkState?.foodRemaining>0?5:0);}
/** Food only: healing from potions, shields and other items must not call this hook. */
export function consumeSportsDrinkFood(player){if(!player.equipmentSlots?.some(i=>i?.id==='sports-drink'))return;const state=player.sportsDrinkState??={crit:0,elapsed:0,time:0,foodRemaining:0};state.foodRemaining=10;}
export function updateSportsDrink(player,delta){const item=player.equipmentSlots?.find(i=>i?.id==='sports-drink');if(!item){delete player.sportsDrinkState;player.sportsDrinkAimOffset=0;return;}const state=player.sportsDrinkState??={crit:0,elapsed:0,time:0,foodRemaining:0};const dt=Math.max(0,Number(delta)||0);state.time+=dt;state.foodRemaining=Math.max(0,state.foodRemaining-dt);player.sportsDrinkAimOffset=0;if(item.isSuper||item.awakened){state.crit=0;state.elapsed=0;player.sportsDrinkAimOffset=(Math.sin(state.time*3.7)+.4*Math.sin(state.time*6.1))*.035*itemPenaltyMultiplier(player)||0;return;}state.elapsed+=dt;const ticks=Math.floor(state.elapsed);state.elapsed-=ticks;state.crit=Math.min([10,15,20][Math.min(2,Math.max(0,(item.level||1)-1))],state.crit+ticks);}
