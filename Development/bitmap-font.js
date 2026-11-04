import { font21Metrics } from './font21-metrics.js';
import { font2Metrics } from './font2-metrics.js';
import { thinFontMetrics } from './font-thin-metrics.js';
import { fontMetrics } from './font-metrics.js';
const highlightedGlyphs=new Map();

/** Important EX values/effects use yellow ink, without changing the wording or wrapping. */
export function statHighlightRanges(text) {
  return [...text.matchAll(/\d+(?:\.\d+)?\s*(?:%|×|x\b)?|\b(?:seconds?|critical chance|noncritical|stunning|knocking enemies aside|unlimited piercing|stored[- ]charge|ATK)\b/gi)]
    .map(match=>({start:match.index,end:match.index+match[0].length}));
}

/** Tint bright glyph ink once and preserve the original dark outline and transparency. */
function yellowGlyph(image,glyph,variant,character) {
  const key=`${variant}:${character}`;if(highlightedGlyphs.has(key))return highlightedGlyphs.get(key);
  const tile=document.createElement('canvas');tile.width=glyph.width;tile.height=glyph.height;
  const context=tile.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,glyph.x,glyph.y,glyph.width,glyph.height,0,0,glyph.width,glyph.height);
  const pixels=context.getImageData(0,0,tile.width,tile.height);
  for(let i=0;i<pixels.data.length;i+=4)if(pixels.data[i]>160&&pixels.data[i+1]>160&&pixels.data[i+2]>160) {
    pixels.data[i]=255;pixels.data[i+1]=225;pixels.data[i+2]=90;
  }
  context.putImageData(pixels,0,0);highlightedGlyphs.set(key,tile);return tile;
}

/** Return tight glyph bounds so only the dark outlines meet between letters. */
export function glyphRectangle(character) {
  return fontMetrics[character] || fontMetrics['?'];
}

/** Render crisp HUD text from the supplied font sheet, refreshing only on changes. */
export function createBitmapText(canvas, { scale = 2, outlineOverlap = 1, spaceWidth = 3, fitWidth = null, variant = 'regular', maxWidth = null, wrap = true, highlightStats = false } = {}) {
  const image = new Image();
  let loaded = false;
  let text = '';
  const sourceScale = variant === 'font21' ? .25 : 1;
  const lineHeight = variant === 'font21' ? 24 : 20;
  const glyphFor = character => variant === 'font21' ? font21Metrics[character] || font21Metrics['?'] : variant === 'font2' ? font2Metrics[character] || font2Metrics['?'] : variant === 'thin' ? thinFontMetrics[character] || thinFontMetrics['?'] : glyphRectangle(character);

  function render() {
    // EDIT scale/outlineOverlap via options: 2x glyphs, one source outline pixel overlap.
    const lines = [''];
    const measure = value => [...value].reduce((sum, c) => sum + (c === ' ' ? spaceWidth : glyphFor(c).width * sourceScale - outlineOverlap), outlineOverlap) * scale;
    for (const word of text.split(' ')) {
      const index = lines.length - 1;
      const next = lines[index] ? `${lines[index]} ${word}` : word;
      if (wrap && maxWidth && lines[index] && measure(next) > maxWidth) lines.push(word);
      else lines[index] = next;
    }
    canvas.width = Math.max(1, ...lines.map(measure));
    canvas.height = lineHeight * scale * lines.length;
    canvas.style.width = fitWidth || `${canvas.width}px`;
    canvas.style.height = fitWidth ? 'auto' : `${canvas.height}px`;
    canvas.setAttribute('aria-label', text);
    if (!loaded) return;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    lines.forEach((line, row) => {
      let x = 0,index=0;const highlights=highlightStats?statHighlightRanges(line):[];
      for (const character of line) {
        if (character !== ' ') {
          const glyph = glyphFor(character);
          const highlighted=highlights.some(range=>index>=range.start&&index<range.end);
          const source=highlighted?yellowGlyph(image,glyph,variant,character):image;
          context.drawImage(source, highlighted?0:glyph.x, highlighted?0:glyph.y, glyph.width, glyph.height,
            x * scale, (row * lineHeight + glyph.offsetY * sourceScale) * scale, glyph.width * sourceScale * scale, glyph.height * sourceScale * scale);
        }
        x += character === ' ' ? spaceWidth : glyphFor(character).width * sourceScale - outlineOverlap;
        index+=character.length;
      }
    });
  }

  image.onload = () => { loaded = true; render(); };
  image.src = new URL(variant === 'font21' ? '../sprites/font2.1.png' : variant === 'font2' ? '../sprites/font2.png' : variant === 'thin' ? '../sprites/font-thin.png' : '../sprites/font.png', import.meta.url).href;
  return {
    setMaxWidth(value) { maxWidth = value; render(); },
    setText(value) {
      if (text === value) return;
      text = value;
      render();
    }
  };
}
