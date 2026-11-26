/** MAX weapons use their own energy color; awakening remains a separate upgrade. */
export function enhancedWeaponGlow(weapon) {
  if(weapon?.isSuper)return '#ffd45a';
  if(!weapon||!(weapon.level>=7))return '';
  // Plana's awakened outline/sparkles are handled by the existing CSS treatment.
  if(weapon.id==='plana-umbrella'&&weapon.awakened)return '';
  return weapon.id==='luminous-nova'?'#ff71d5':weapon.id==='aris-laser'?'#65cfff':'#ffd45a';
}

/** Apply the glow to the icon silhouette, never the surrounding inventory box. */
export function applyEnhancedWeaponGlow(element,weapon) {
  const color=enhancedWeaponGlow(weapon);
  element.style.filter=color?`drop-shadow(0 0 2px ${color}) drop-shadow(0 0 5px ${color})`:'';
}
