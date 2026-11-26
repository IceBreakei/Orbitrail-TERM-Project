import { drawingBounds, normalizeSkillStrokes } from './skill-drawing.js';
import { skillCastSettings } from './game-config.js';

/** Canonical pattern matching the EX Skills reference diagram. */
export function planaReferenceStrokes() {
  return [Array.from({ length: 97 }, (_, i) => ({
    x: 100 + 86 * Math.cos(i / 96 * Math.PI * 2),
    y: 100 + 86 * Math.sin(i / 96 * Math.PI * 2)
  })), [{ x: 100, y: 94 }, { x: 100, y: 43 }],
  [{ x: 76, y: 67 }, { x: 100, y: 43 }, { x: 124, y: 67 }],
  [{ x: 75, y: 119 }, { x: 125, y: 160 }],
  [{ x: 125, y: 119 }, { x: 75, y: 160 }]];
}

/** Uniformly sample ink length, ignoring pen speed, stroke order and direction. */
function normalizedInk(strokes) {
  strokes = normalizeSkillStrokes(strokes);
  const bounds = drawingBounds(strokes);
  if (!bounds) return [];
  const size = Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top, 1);
  const points = [];
  for (const stroke of strokes) for (let i = 1; i < stroke.length; i++) {
    const a = stroke[i - 1], b = stroke[i];
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / size * 180));
    for (let j = 0; j <= count; j++) points.push({
      x: (a.x + (b.x - a.x) * j / count - (bounds.left + bounds.right) / 2) / size,
      y: (a.y + (b.y - a.y) * j / count - (bounds.top + bounds.bottom) / 2) / size
    });
  }
  // Bound comparison work even for very long mouse strokes.
  const unique = [...new Map(points.map(p => [
    `${Math.round(p.x * 10000)},${Math.round(p.y * 10000)}`, p
  ])).values()].sort((a, b) => Math.round(a.x * 10000) - Math.round(b.x * 10000) ||
    Math.round(a.y * 10000) - Math.round(b.y * 10000));
  return unique.filter((_, i) => i % Math.max(1, Math.ceil(unique.length / 320)) === 0);
}

/** Symmetric ink distance rewards the entire reference, including missing/extra marks. */
export function drawingAccuracy(strokes, referenceStrokes = planaReferenceStrokes()) {
  const actual = normalizedInk(strokes), reference = normalizedInk(referenceStrokes);
  if (!actual.length) return 0;
  const nearestMean = (from, to) => from.reduce((total, p) => total +
    Math.min(...to.map(q => Math.hypot(p.x - q.x, p.y - q.y))), 0) / from.length;
  const error = (nearestMean(actual, reference) + nearestMean(reference, actual)) / 2;
  return Math.max(0, Math.min(1, 1 - error / skillCastSettings.accuracyDistanceTolerance));
}

/** Map successful reference accuracy to minimum/typical/perfect damage anchors. */
export function skillDamageMultiplier(accuracy) {
  const s = skillCastSettings;
  const value = Number.isFinite(accuracy) ? accuracy : s.accuracyAverage;
  const low = value <= s.accuracyAverage;
  const start = low ? s.accuracyMinimum : s.accuracyAverage;
  const end = low ? s.accuracyAverage : s.accuracyPerfect;
  const from = low ? s.damageMinimum : s.damageAverage;
  const to = low ? s.damageAverage : s.damageMaximum;
  return from + (to - from) * Math.max(0, Math.min(1, (value - start) / (end - start)));
}
