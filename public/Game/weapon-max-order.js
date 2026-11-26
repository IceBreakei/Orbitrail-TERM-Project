/** Record the first time a weapon reaches MAX, independent of inventory position. */
export function recordWeaponMax(player,weapon) {
  if(!weapon||weapon.isSynergy||weapon.level<(weapon.maxLevel||7)||weapon.maxedOrder!==undefined)return;
  player.weaponMaxSequence=Math.max(player.weaponMaxSequence||0,...(player.attackSlots||[]).map(w=>w?.maxedOrder||0))+1;
  weapon.maxedOrder=player.weaponMaxSequence;
}
