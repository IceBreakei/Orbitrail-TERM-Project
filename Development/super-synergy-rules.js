import {superSynergyRecipes} from './super-synergy-recipes.js';
export const superSynergySettings={minimumLevel:50,synergyThreshold:3,maxCrafts:1};
export function createSuperSynergyRun(){return {hammer:'none',hammerCreated:false,crafted:false,groundPosition:null,adminHammerPieces:0};}
export const superSynergyRun=createSuperSynergyRun();
export function superSynergyProgress(player,state=superSynergyRun,recipes=superSynergyRecipes){
  if(state.crafted)return {stage:'complete',frame:null};
  const weapons=(player.attackSlots||[]).filter(Boolean),count=weapons.filter(w=>w.isSynergy&&!w.isSuperSynergy).length;
  const eligible=recipes.some(recipe=>weapons.some(w=>w.id===recipe.synergyId));
  if(state.hammer==='held')return {stage:'hammer',frame:2};
  if(!eligible&&!state.adminHammerPieces)return {stage:'hidden',frame:null};
  const pieces=Math.max(eligible?(count>=2?2:1):0,state.adminHammerPieces||0);
  return {stage:pieces>=2?'shaft':'half-shaft',frame:pieces>=2?1:0,
    earn:eligible&&!state.hammerCreated?(count>=3?'held':(player.level||1)>=50?'ground':null):null};
}
export function advanceSuperSynergyProgress(player,state=superSynergyRun,recipes=superSynergyRecipes){
  const progress=superSynergyProgress(player,state,recipes);
  if(progress.earn){state.hammerCreated=true;state.hammer=progress.earn;}
  return superSynergyProgress(player,state,recipes);
}
/** Admin-only progression shortcut: each click adds one visual stage, without changing recipes. */
export function grantGoldenHammerPiece(player,state=superSynergyRun){
  if(state.crafted||state.hammer!=='none')return false;
  const current=superSynergyProgress(player,state);
  state.adminHammerPieces=Math.min(3,Math.max(state.adminHammerPieces||0,current.frame===null?0:current.frame+1)+1);
  if(state.adminHammerPieces>=3){state.hammer='held';state.hammerCreated=true;state.groundPosition=null;}
  return true;
}
export function collectGoldenHammer(state=superSynergyRun){
  if(state.hammer!=='ground'||state.crafted)return false;
  state.hammer='held';state.groundPosition=null;return true;
}
function validItem(item,id){
  return item&&(item.id===id||item.baseItemId===id)&&
    (item.isSuper===true||item.super===true||item.superItem===true||(Number.isFinite(item.maxLevel)&&(item.level||1)>=item.maxLevel));
}
export function superSynergyChoices(player,state=superSynergyRun,recipes=superSynergyRecipes){
  if(player.synnergyBan||state.crafted||state.hammer!=='held')return [];
  const choices=[];for(const recipe of recipes){
    if(!recipe.id||!recipe.result?.id||player.attackSlots?.some(w=>w?.id===recipe.result.id))continue;
    for(let a=0;a<Math.min(6,player.attackSlots?.length||0);a++){
      if(player.attackSlots[a]?.id!==recipe.synergyId)continue;
      for(let b=0;b<Math.min(6,player.equipmentSlots?.length||0);b++){
        if(!validItem(player.equipmentSlots[b],recipe.itemId))continue;
        choices.push({id:`super-synergy:${recipe.id}:${a}:${b}`,name:recipe.result.name||recipe.result.id,label:'Super Synnergize',kind:'super-synergy',target:recipe.result,recipe,slots:[a,6+b],disabled:false,
          description:recipe.description||`Fuse ${player.attackSlots[a].name||recipe.synergyId} and ${player.equipmentSlots[b].name||recipe.itemId}.`});
      }
    }
  }return choices;
}
export function applySuperSynergyChoice(player,id,state=superSynergyRun,recipes=superSynergyRecipes){
  const choice=superSynergyChoices(player,state,recipes).find(c=>c.id===id);
  if(!choice)return {consumed:false,success:false,message:'Super Synnergy requirements are not met.'};
  let result;try{result=choice.recipe.createWeapon?choice.recipe.createWeapon():{...choice.recipe.result};}catch{return {consumed:false,success:false,message:'Super Synnergy unavailable.'};}
  if(result?.id!==choice.recipe.result.id)return {consumed:false,success:false,message:'Super Synnergy unavailable.'};
  const [weaponSlot,itemSlot]=choice.slots;
  player.attackSlots[weaponSlot]={...result,level:result.level||1,isSynergy:true,isSuperSynergy:true,consumedWeaponIds:[...new Set([...(result.consumedWeaponIds||[]),choice.recipe.synergyId,...(player.attackSlots[weaponSlot].consumedWeaponIds||[])])],consumedItemIds:[choice.recipe.itemId]};
  player.equipmentSlots[itemSlot-6]=null;
  state.hammer='used';state.crafted=true;state.hammerCreated=true;state.groundPosition=null;
  return {consumed:true,success:true,message:`${result.name||result.id} created!`};
}
