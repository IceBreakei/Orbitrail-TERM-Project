import { crafterSettings, crafterEnhancementCost, crafterEnhancementChance, umbrellaUpgradeSettings, arisWeaponSettings } from './game-config.js';
import { getLootTotals, spendCredits, spendSecretTechNotes } from './exp-drops.js';
import { recordWeaponMax } from './weapon-max-order.js';

/** List only equipped targets, keeping item upgrades capped and awakening main-weapon-only. */
export function crafterChoices(player) {
  const choices=[],loot=getLootTotals();
  for(const [kind,slots] of [['weapon',player.attackSlots||[]],['item',player.equipmentSlots||[]]]) {
    slots.forEach((target,index)=>{
      if(!target)return;
      const max=target.id==='plana-umbrella'?umbrellaUpgradeSettings.maxLevel:
        target.id==='aris-laser'?arisWeaponSettings.maxLevel:target.maxLevel;
      if(!Number.isFinite(max))return;
      const prefix=`${kind}:${index}`,name=target.name||target.id||'Item',level=target.level||1;
      if(!target.isSynergy&&level<max)choices.push({id:`${prefix}:level`,target,kind,name,label:`Upgrade to LV ${level+1}`,cost:0,disabled:false});
      else if(kind==='weapon') {
        const rank=(target.enhancementRank||0)+1,cost=crafterEnhancementCost(rank);
        const chance=crafterEnhancementChance(rank,player.enhancementRateBonusPercent||0);
        choices.push({id:`${prefix}:enhance`,target,kind,name,label:`Enhance +${rank} — ${cost} Credits — ${Math.round(chance*100)}% success`,cost,chance,rank,disabled:loot.credits<cost});
      }
      const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null);
      if(kind==='weapon'&&target.id==='plana-umbrella'&&main===target.id&&level>=max&&!target.awakened) {
        choices.push({id:`${prefix}:awaken`,target,kind,name,label:`Awaken — ${umbrellaUpgradeSettings.awakeningNoteCost} Secret Tech Note`,disabled:loot.secretTechNotes<umbrellaUpgradeSettings.awakeningNoteCost});
      }
    });
  }
  return choices;
}

/** A valid attempt consumes one Crafter even when a paid enhancement fails. */
export function applyCrafterChoice(player,id,random=Math.random) {
  const choice=crafterChoices(player).find(c=>c.id===id);
  if(!choice||choice.disabled)return {consumed:false,success:false,message:'That upgrade is unavailable.'};
  const action=id.split(':').at(-1),target=choice.target;
  if(action==='level') {target.level=(target.level||1)+1;if(choice.kind==='weapon')recordWeaponMax(player,target);return {consumed:true,success:true,message:`${choice.name} upgraded to LV ${target.level}.`};}
  if(action==='awaken') {
    if(!spendSecretTechNotes(umbrellaUpgradeSettings.awakeningNoteCost))return {consumed:false,success:false};
    target.awakened=true;return {consumed:true,success:true,message:`${choice.name} awakened!`};
  }
  if(!spendCredits(choice.cost))return {consumed:false,success:false};
  const success=random()<choice.chance;
  if(success)target.enhancementRank=choice.rank;
  return {consumed:true,success,message:success?`${choice.name} enhanced to +${choice.rank}!`:`Enhancement failed. ${choice.cost} Credits and the Crafter were consumed.`};
}
