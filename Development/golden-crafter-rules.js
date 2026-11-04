import { synergyRecipes } from './synergy-recipes.js';
import { umbrellaUpgradeSettings, arisWeaponSettings } from './game-config.js';

/** Use each weapon's actual MAX level, including future weapon definitions. */
function maximumLevel(weapon) {
  return weapon.id==='plana-umbrella'?umbrellaUpgradeSettings.maxLevel:
    weapon.id==='aris-laser'?arisWeaponSettings.maxLevel:weapon.maxLevel;
}

/** Only compatible, equipped MAX pairs can cause a Golden Crafter drop or fusion choice. */
export function goldenCrafterChoices(player,recipes=synergyRecipes) {
  const slots=player.attackSlots||[],choices=[];
  for(const recipe of recipes) {
    if(!recipe.id||!recipe.result?.id||recipe.ingredients?.length!==2||slots.some(w=>w?.id===recipe.result.id))continue;
    for(let a=0;a<Math.min(6,slots.length);a++)for(let b=a+1;b<Math.min(6,slots.length);b++) {
      const first=slots[a],second=slots[b];if(!first||!second)continue;
      const ids=[first.id,second.id].sort(),needed=[...recipe.ingredients].sort();
      if(ids[0]!==needed[0]||ids[1]!==needed[1])continue;
      if(!Number.isFinite(maximumLevel(first))||!Number.isFinite(maximumLevel(second))||
        (first.level||1)<maximumLevel(first)||(second.level||1)<maximumLevel(second))continue;
      choices.push({id:`synergy:${recipe.id}:${a}:${b}`,name:recipe.result.name||recipe.result.id,
        label:'Fuse MAX weapons',kind:'synergy',target:recipe.result,recipe,slots:[a,b],disabled:false,
        description:recipe.description||`Fuse ${first.name||first.id} and ${second.name||second.id} into ${recipe.result.name||recipe.result.id}.`});
    }
  }
  return choices;
}

/** Replace the two ingredients with one synergy atomically; cancellation never calls this. */
export function applyGoldenCrafterChoice(player,id,recipes=synergyRecipes) {
  const choice=goldenCrafterChoices(player,recipes).find(choice=>choice.id===id);
  if(!choice)return {consumed:false,success:false,message:'No compatible MAX-level weapon pair.'};
  let result;
  try{result=choice.recipe.createWeapon?choice.recipe.createWeapon():{...choice.recipe.result};}
  catch{return {consumed:false,success:false,message:'Fusion unavailable. The Golden Crafter was not used.'};}
  if(!result||result.id!==choice.recipe.result.id)return {consumed:false,success:false,message:'Fusion unavailable.'};
  const [a,b]=choice.slots;
  const enchantments=choice.slots.flatMap(index=>{
    const item=player.attackSlots[index];const values=item.enchantments|| (item.enchantment?[item.enchantment]:[]);
    return values.slice(0,1).map(value=>typeof value==='object'?{...value}:value);
  });
  result={...result,level:result.level||1,isSynergy:true,consumedWeaponIds:[...choice.recipe.ingredients]};
  // Draw the first MAX ingredient last, so it is on top of the crossing.
  const earliest=choice.slots.map(index=>player.attackSlots[index]).sort((a,b)=>(a.maxedOrder??Infinity)-(b.maxedOrder??Infinity))[0];
  result.synergyTopWeaponId=earliest.id;
  if(enchantments.length)result.enchantments=enchantments;
  player.attackSlots[a]=result;player.attackSlots[b]=null;
  return {consumed:true,success:true,message:`${result.name||result.id} created!`};
}
