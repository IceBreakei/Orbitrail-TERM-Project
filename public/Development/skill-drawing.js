import { skillCastSettings } from './game-config.js';

/** Normalize X/Y independently so canvas size and squashed proportions do not affect casting. */
export function normalizeSkillStrokes(strokes) {
  const bounds = drawingBounds(strokes);
  if (!bounds) return [];
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  if (!(width > 0) || !(height > 0)) return [];
  return strokes.map(stroke => stroke.map(point => ({
    x: (point.x - bounds.left) / width * 200,
    y: (point.y - bounds.top) / height * 200
  })));
}

/** Measure the drawing alone, excluding the game, HUD, dimmer and decorative stroke glow. */
export function drawingBounds(strokes) {
  const points = strokes.flat();
  if (!points.length) return null;
  return points.reduce((bounds, point) => ({ left: Math.min(bounds.left, point.x),
    top: Math.min(bounds.top, point.y), right: Math.max(bounds.right, point.x),
    bottom: Math.max(bounds.bottom, point.y) }),
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
}

/** Normalize a cropped sketch into a square black-on-white image for QuickDraw. */
export function drawingModelImage(strokes, createCanvas = () => document.createElement('canvas')) {
  const bounds = drawingBounds(strokes);
  if (!bounds) return null;
  const canvas = createCanvas(), size = skillCastSettings.modelInputSize;
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, size, size);
  const usable = size - skillCastSettings.modelPadding * 2;
  const scale = usable / Math.max(1, bounds.right - bounds.left, bounds.bottom - bounds.top);
  const centerX = (bounds.left + bounds.right) / 2, centerY = (bounds.top + bounds.bottom) / 2;
  context.strokeStyle = '#000'; context.lineWidth = skillCastSettings.modelLineWidth;
  context.lineCap = context.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    context.beginPath();
    stroke.forEach((point, index) => {
      const x = size / 2 + (point.x - centerX) * scale, y = size / 2 + (point.y - centerY) * scale;
      if (index) context.lineTo(x, y); else context.moveTo(x, y);
    });
    context.stroke();
  }
  return canvas.toDataURL('image/png');
}

/** Render the visible Schale-style cyan/blue/lilac line, retaining separate pen strokes. */
export function drawSkillStrokes(context, strokes, width, height) {
  context.clearRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, height, width, 0);
  gradient.addColorStop(0, '#b7fbff'); gradient.addColorStop(0.35, '#45dcff');
  gradient.addColorStop(0.7, '#408dff'); gradient.addColorStop(1, '#d6acff');
  context.save();
  context.strokeStyle = gradient; context.lineWidth = skillCastSettings.lineWidth;
  context.lineCap = context.lineJoin = 'round'; context.shadowColor = '#62dfff'; context.shadowBlur = 9;
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    context.beginPath();
    stroke.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.stroke();
  }
  context.restore();
}
