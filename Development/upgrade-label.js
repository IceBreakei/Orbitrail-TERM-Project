/** Show both sides of a level upgrade; MAX is the final normal upgrade, not awakening. */
export function upgradeLevelLabel(item,maximum=item.maxLevel||7) {
  const current=item.level||1,next=current+1;
  return `LV ${current} -> ${next>=maximum?'MAX':`LV ${next}`}`;
}
