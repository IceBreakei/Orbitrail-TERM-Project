import { isContentUnlocked } from './item-catalog.js';
const limits={reroll:10,eliminate:10,hold:5};
export function levelActionUses(player,action){
  const purchased=Math.max(0,Math.min(limits[action],Math.trunc(Number(player.abilityUpgradeRanks?.[action])||0)));
  const granted=!player.shopUnlocks&&isContentUnlocked('developer-level-actions')?limits[action]:purchased;
  return Math.max(0,granted-(player.levelActionSpent?.[action]||0));
}
export function spendLevelAction(player,action){
  if(!levelActionUses(player,action))return false;
  player.levelActionSpent??={};player.levelActionSpent[action]=(player.levelActionSpent[action]||0)+1;return true;
}
export function levelActionChoices(player,pool,random=Math.random){
  const remaining=pool.slice(),choices=[];
  while(remaining.length){
    const weight=choice=>Math.max(0,Number(choice.weapon?.weight??1)||0),total=remaining.reduce((sum,c)=>sum+weight(c),0);
    let roll=random()*total,index=remaining.length-1;
    for(let i=0;i<remaining.length;i++){roll-=weight(remaining[i]);if(roll<0){index=i;break;}}
    choices.push(...remaining.splice(index,1));
  }
  const held=choices.findIndex(choice=>choice.id===player.heldUpgradeId);
  if(held>=0)choices.unshift(...choices.splice(held,1));
  return choices;
}
