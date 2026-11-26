/** Two-second eligibility window, recorded before a lethal hit dispatches defeat listeners. */
export function recordRateUpHit(enemy,chance){
  if(!(chance>0))return false;
  enemy.rateUpHitAge=0;enemy.rateUpChance=chance;return true;
}
export function updateRateUpWindow(enemy,delta){
  if(enemy.rateUpHitAge!==undefined)enemy.rateUpHitAge+=Math.max(0,delta);
}
export function rateUpRollSucceeds(enemy,random=Math.random){
  return enemy.rateUpHitAge!==undefined&&enemy.rateUpHitAge<=2&&enemy.rateUpChance>0&&random()<enemy.rateUpChance;
}

export function rateUpDropChance(enemy){
  return enemy.rateUpHitAge!==undefined&&enemy.rateUpHitAge<=2?enemy.rateUpChance||0:0;
}
