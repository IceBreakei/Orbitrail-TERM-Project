export const damageFlashDuration = 240; // EDIT total pulse length in milliseconds.
const riseDuration = 45; // Fast gradual rise, followed by a longer fade out.
const whiteSprites = new WeakMap();

/** Return a smooth white-tint intensity, never a full-screen or rectangular flash. */
export function getDamageFlashOpacity(character) {
  const elapsed = character.damageFlashElapsed;
  if (elapsed === undefined || elapsed < 0 || elapsed >= damageFlashDuration) return 0;
  const progress = elapsed < riseDuration
    ? elapsed / riseDuration
    : 1 - (elapsed - riseDuration) / (damageFlashDuration - riseDuration);
  const smooth = progress * progress * (3 - 2 * progress);
  return smooth * 0.85;
}

/** Advance visual feedback independently of whether movement AI is paused. */
export function advanceDamageFlash(character, delta) {
  if (character.damageFlashElapsed === undefined) return;
  character.damageFlashElapsed += delta * 1000;
  if (character.damageFlashElapsed >= damageFlashDuration) {
    delete character.damageFlashElapsed;
  }
}

/** Cache a white silhouette retaining the original image's transparent pixels. */
export function getWhiteSprite(image) {
  if (!whiteSprites.has(image)) {
    const surface = document.createElement('canvas');
    surface.width = image.naturalWidth;
    surface.height = image.naturalHeight;
    const context = surface.getContext('2d');
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, surface.width, surface.height);
    whiteSprites.set(image, surface);
  }
  return whiteSprites.get(image);
}

const slowedSprites=new WeakMap();
/** Slow overlays tint opaque sprite pixels only; cached per sheet or decoded GIF frame. */
export function getSlowedSprite(image){
 if(!slowedSprites.has(image)){
  const surface=document.createElement('canvas');surface.width=image.naturalWidth;surface.height=image.naturalHeight;
  const context=surface.getContext('2d');context.drawImage(image,0,0);context.globalCompositeOperation='source-in';context.fillStyle='#173c86';context.fillRect(0,0,surface.width,surface.height);slowedSprites.set(image,surface);
 }
 return slowedSprites.get(image);
}
export function getSlowTintOpacity(character){
 if(character.death||character.hp===0||character.isPlayerVisual)return 0;
 return (character.ridingWaveSlowRemaining>0||(character.splashSlowRemaining>0&&character.splashSlowPercent>0)||(character.slowdownRemaining>0&&character.slowdownPercent>0)) ? .48 : 0;
}

const poisonedSprites=new WeakMap();
export function getPoisonedSprite(image){if(!poisonedSprites.has(image)){const surface=document.createElement('canvas');surface.width=image.naturalWidth;surface.height=image.naturalHeight;const context=surface.getContext('2d');context.drawImage(image,0,0);context.globalCompositeOperation='source-in';context.fillStyle='#60bf49';context.fillRect(0,0,surface.width,surface.height);poisonedSprites.set(image,surface);}return poisonedSprites.get(image);}
export function getPoisonTintOpacity(character){return (character.poisonRemaining>0&&character.hp!==0&&!character.death&&!character.isPlayerVisual) ? .32 : 0;}
