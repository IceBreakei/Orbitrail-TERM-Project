import { percentBonusFormula, attackDamageFormula, weaponDamageFormula, growthSettings, totalATKFormula, attackStatSettings, totalCritModFormula, bonusDamageTakenFormula, damageBonusFormula, damageReductionFormula, haloDamageFormula, damageModifiersFormula } from './game-config.js';
import { defaultCombatStats, combatBalance } from './game-config.js';
export { defaultCombatStats } from './game-config.js';
// Percent bonuses: zero keeps base values. CRIT is a direct chance percentage.


/** Initialize independent per-character combat stats without resetting upgrades. */
export function ensureCombatStats(character) {
  character.combatStats ??= {};
  character.combatStats.damageBonusMultipliers ??= [];
  for (const [key, value] of Object.entries(defaultCombatStats)) character.combatStats[key] ??= value;
  return character.combatStats;
}

/** Convert a bonus percentage to a multiplier (25% means 1.25 times base). */
export function statMultiplier(character, key) {
  const value = Number(ensureCombatStats(character)[key]);
  if (key === 'atkPercent') return totalCharacterATK(character) / 100;
  return percentBonusFormula(value);
}

/** Roll per-hit critical chance; target debuffs add percentage points before clamping. */
export function rollAttackDamage(character, totalWeaponDamage, random = Math.random,
  { damageMod = 1, forceCritical = false, targetCritBonus = 0, criticalMultiplier, weaponCritDamagePercent = 0, target } = {}) {
  const stats = ensureCombatStats(character);
  const buffs=Object.values(character.combatBuffs||{}).filter(Boolean);
  const bonusCrit=buffs.reduce((sum,buff)=>sum+(Number(buff.critPercent)||0),0);
  const critical = forceCritical || random() < Math.max(0, Math.min(100, stats.critPercent + bonusCrit + targetCritBonus)) / 100;
  const combinedModifier = damageModifiersFormula({
    criticalMultiplier: critical ? characterCriticalMultiplier(character, criticalMultiplier, weaponCritDamagePercent) : 1,
    bonusDamageTaken: bonusDamageTakenFormula(target?.bonusDamageTakenPercent ?? []),
    DB: damageBonusFormula([...stats.damageBonusMultipliers,...buffs.map(buff=>buff.damageBonusMultiplier).filter(Number.isFinite)]),
    DR: damageReductionFormula(target?.damageReductionPercent ?? []),
    halo: characterHaloMultiplier(character, target),
    attackModifier: damageMod // Attack-specific effects, including EX drawing accuracy.
  });
  return { damage: attackDamageFormula(totalWeaponDamage, totalCharacterATK(character), combinedModifier, random),
    critical, type: critical ? 'critical' : 'normal' };
}

/** Build weapon damage with independent level bonuses and optional purchased Growth.
 * mainWeaponId can explicitly identify a character main weapon; Plana defaults to her umbrella.
 */
export function totalWeaponDamage(character, weaponId, base, bonusesPercent = [], options = {}) {
  const mainWeaponId = character.mainWeaponId ?? (character.label === 'Plana' ? 'plana-umbrella' : null);
  const weapon=character.attackSlots?.find(item=>item?.id===weaponId);
  return weaponDamageFormula(base, bonusesPercent, {
    ...options, enhancementRank:weapon?.enhancementRank ?? 0, growthEligible: weaponId === mainWeaponId,
    growthRank: character.growthRank ?? growthSettings.defaultRank, playerLevel: character.level ?? 1
  });
}


/** Add the accumulated item/skill ATK bonus to the character's independent base ATK. */
export function totalCharacterATK(character) {
  return totalATKFormula(character.baseATK ?? attackStatSettings.baseATK,
    [Number(ensureCombatStats(character).atkPercent)]);
}


/** Add character and weapon critical damage bonuses; overrides replace only the base.
 * criticalMultiplier is an optional weapon base override (e.g. Umbrella LV7=3).
 * critDamagePercent contains accumulated bonuses, separate from critical chance.
 */
export function characterCriticalMultiplier(character, criticalMultiplier, weaponBonus = 0) {
  const base = criticalMultiplier !== undefined ? (criticalMultiplier - 1) * 100 :
    (character.baseCritMod ?? (combatBalance.criticalMultiplier - 1) * 100);
  const bonus = ensureCombatStats(character).critDamagePercent;
  return Math.max(0, 1 + totalCritModFormula(base, [bonus, weaponBonus]) / 100);
}


/** Measure character-to-target world distance at the hit, never from projectile origin. */
export function characterHaloMultiplier(character, target) {
  if (!target || ![character.x, character.y, target.x, target.y].every(Number.isFinite)) return 1;
  return haloDamageFormula(Math.hypot(target.x - character.x, target.y - character.y), character.haloLevel ?? 0);
}
