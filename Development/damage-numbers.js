import { damageNumberSettings } from './game-config.js';
export { damageNumberSettings } from './game-config.js';
import { fontMetrics } from './font-metrics.js';

const numbers = [];
const textCache = new Map();
let font;

/** Load one shared bitmap font for all damage numbers. */
export function loadDamageNumberGraphics() {
  font = new Image();
  font.src = '../sprites/font.png';
  return font.decode();
}

/** Format normal hits, yellow critical hits, or red supercrit visuals. */
export function damageNumberStyle(amount, player = false, hitType = 'normal') {
  if (hitType === 'miss') return { text: 'MISS', color: '#ffffff', italic: true };
  const text = String(Math.round(amount * 100) / 100);
  if (player) return { text, color: '#ff5265', italic: false };
  if (hitType === 'supercritical') return { text: `${text}!!!`, color: '#ff5265', italic: true, scale: 1.1 };
  if (hitType === 'critical') return { text: `${text}!`, color: '#ffe15a', italic: true, scale: 1.1 };
  return { text, color: '#ffffff', italic: false };
}

/** Queue a damage popup; supercritical styling does not define its trigger. */
export function showDamageNumber(target, amount, player = false, hitType = 'normal', group = null) {
  if ((!(amount > 0) && hitType !== 'miss') || !Number.isFinite(amount) || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;
  // Only the synergy accumulates rapid hits, independently for each enemy and damage source.
  if(group&&hitType!=='miss') {
    const existing=numbers.findLast(number=>number.target===target&&number.group===group&&!number.closed);
    if(existing&&existing.hitType===hitType&&existing.sinceHit<=.3) {
      existing.amount+=amount;existing.sinceHit=0;existing.elapsed=0;
      Object.assign(existing,{scale:1},damageNumberStyle(existing.amount,player,existing.hitType));
      existing.x=target.x;existing.y=target.y-(target.spriteSize||112)*.4;return;
    }
    // A changed hit type ends this run permanently; its popup continues its existing fade.
    if(existing)existing.closed=true;
  }
  if (numbers.length >= damageNumberSettings.maxCount) numbers.shift();
  numbers.push({ ...damageNumberStyle(amount, player, hitType), elapsed: 0,
    x: target.x, y: target.y - (target.spriteSize || 112) * 0.4,
    target,group,amount,hitType,closed:false,sinceHit:0,drift: (Math.random() - 0.5) * 24 });
}

/** Calculate the upward bounce, downward fall, and gradual end fade. */
export function damageNumberPose(number) {
  const t = number.elapsed;
  const progress = Math.max(0, Math.min(1, t / damageNumberSettings.duration));
  const fade = Math.max(0, Math.min(1, (t - damageNumberSettings.fadeStart) /
    (damageNumberSettings.duration - damageNumberSettings.fadeStart)));
  return { x: number.x + number.drift * t,
    y: number.y - 4 * damageNumberSettings.jumpHeight * progress * (1 - progress),
    opacity: 1 - fade * fade };
}

/** Expire popups even when their targets die or leave the viewport. */
export function updateDamageNumbers(delta) {
  for (let i = numbers.length - 1; i >= 0; i--) {
    numbers[i].elapsed += delta;
    numbers[i].sinceHit += delta;
    if (numbers[i].elapsed >= damageNumberSettings.duration) numbers.splice(i, 1);
  }
}

/** Cache compact tinted bitmap numbers, preserving the font's dark outline. */
function numberGraphic(text, color) {
  const key = `${text}:${color}`;
  if (textCache.has(key)) return textCache.get(key);
  const glyphs = [...text].map(letter => fontMetrics[letter] || fontMetrics['?']);
  const canvas = document.createElement('canvas');
  canvas.width = glyphs.reduce((sum, glyph) => sum + glyph.width - 1, 1);
  canvas.height = 20;
  const context = canvas.getContext('2d');
  let x = 0;
  for (const glyph of glyphs) {
    context.drawImage(font, glyph.x, glyph.y, glyph.width, glyph.height,
      x, glyph.offsetY, glyph.width, glyph.height);
    x += glyph.width - 1;
  }
  if (color !== '#ffffff') {
    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    mask.getContext('2d').drawImage(canvas, 0, 0);
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(mask, 0, 0);
  }
  if (textCache.size >= 128) textCache.delete(textCache.keys().next().value);
  textCache.set(key, canvas);
  return canvas;
}

/** Draw world-anchored numbers above actors, leaving the HUD unaffected. */
export function drawDamageNumbers(context, camera, width, height) {
  if (!font?.naturalWidth) return;
  context.save();
  context.imageSmoothingEnabled = false;
  for (const number of numbers) {
    const pose = damageNumberPose(number);
    const x = pose.x - camera.x, y = pose.y - camera.y;
    if (x < -100 || y < -50 || x > width + 100 || y > height + 50) continue;
    const graphic = numberGraphic(number.text, number.color);
    context.save();
    context.translate(x, y);
    context.scale(number.scale ?? 1, number.scale ?? 1);
    if (number.italic) context.transform(1, 0, -0.18, 1, 0, 0);
    context.globalAlpha = pose.opacity;
    context.drawImage(graphic, -graphic.width * 0.625, 0, graphic.width * 1.25, 25);
    context.restore();
  }
  context.restore();
}
