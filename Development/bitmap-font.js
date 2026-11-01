import { fontMetrics } from './font-metrics.js';

/** Return tight glyph bounds so only the dark outlines meet between letters. */
export function glyphRectangle(character) {
  return fontMetrics[character] || fontMetrics['?'];
}

/** Render crisp HUD text from the supplied font sheet, refreshing only on changes. */
export function createBitmapText(canvas, { scale = 2, outlineOverlap = 1, spaceWidth = 3 } = {}) {
  const image = new Image();
  let loaded = false;
  let text = '';

  function render() {
    // EDIT scale/outlineOverlap via options: 2x glyphs, one source outline pixel overlap.
    const characters = [...text];
    const advances = characters.map(character => character === ' '
      ? spaceWidth : glyphRectangle(character).width - outlineOverlap);
    canvas.width = Math.max(1, (advances.reduce((sum, width) => sum + width, 0) + outlineOverlap) * scale);
    canvas.height = 20 * scale;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    canvas.setAttribute('aria-label', text);
    if (!loaded) return;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    let x = 0;
    for (const [index, character] of characters.entries()) {
      if (character !== ' ') {
        const glyph = glyphRectangle(character);
        context.drawImage(image, glyph.x, glyph.y, glyph.width, glyph.height,
          x * scale, glyph.offsetY * scale, glyph.width * scale, glyph.height * scale);
      }
      x += advances[index];
    }
  }

  image.onload = () => { loaded = true; render(); };
  image.src = '../sprites/font.png';
  return {
    setText(value) {
      if (text === value) return;
      text = value;
      render();
    }
  };
}
