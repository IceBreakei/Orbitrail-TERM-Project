import { drawingBounds } from './skill-drawing.js';
import { drawingAccuracy } from './skill-accuracy.js';
import { skillCastSettings } from './game-config.js';

// Developer-only shortcuts. Register future skills here when their effects exist.
const skillIds = { 'plana-umbrella': 'plana-umbrella-launch', 'aris-laser': 'supernova-beam', 'luminous-nova':'luminous-nova-aura','princess-key':'princess-key-ex' };
const path = coordinates => coordinates.map(([x, y]) => ({ x, y }));
export const adminDigitTemplates = {
  1: [path([[30, 20], [50, 0], [50, 100]])],
  2: [path([[0, 15], [20, 0], [70, 0], [95, 20], [90, 40], [0, 100], [100, 100]])],
  3: [path([[0, 0], [80, 0], [100, 20], [70, 50], [35, 50], [80, 50], [100, 75], [80, 100], [0, 100]])],
  4: [path([[70, 0], [0, 65], [100, 65]]), path([[70, 0], [70, 100]])],
  5: [path([[100, 0], [0, 0], [0, 50], [75, 50], [100, 70], [90, 95], [55, 100], [0, 90]])],
  6: [path([[90, 0], [40, 10], [10, 40], [0, 75], [20, 100], [75, 100], [100, 75], [80, 50], [30, 50], [0, 75]])]
};

/** Match handwritten 1â€“6 locally, without downloading or calling either AI model. */
export function recognizeAdminDigit(strokes) {
  const bounds = drawingBounds(strokes);
  if (!bounds) return null;
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  if (height > 0 && width / height < .18) return 1;
  const ranked = Object.entries(adminDigitTemplates).map(([digit, template]) =>
    ({ digit: Number(digit), score: drawingAccuracy(strokes, template) })).sort((a, b) => b.score - a.score);
  return ranked[0].score >= .45 && ranked[0].score - ranked[1].score >= .025 ? ranked[0].digit : null;
}

/** Resolve a slot only when it contains a weapon with an implemented EX effect. */
export function adminSkillResult(player, slot) {
  const weapon = player.attackSlots?.[slot];
  const skillId = skillIds[weapon?.id];
  return skillId ? { valid: true, adminTest: true, weapon, skillId,
    label: weapon.name || weapon.id, score: 1, accuracy: skillCastSettings.accuracyAverage,
    damageMultiplier: skillCastSettings.damageAverage, components: [] }
    : { valid: false, reason: `Slot ${slot + 1} has no implemented EX skill.` };
}
