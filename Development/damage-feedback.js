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
