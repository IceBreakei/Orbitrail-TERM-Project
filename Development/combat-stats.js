import { sportsDrinkCritBonus, itemCritPenalty, itemDamageBonus, overclockingStats, itemSkillDamageMultiplier } from './item-catalog.js';
import { tuningPerk, startingWeaponProjectileCount, emptyWeaponSlotCount, weaponTuningDamageBonus, stationaryTuningActive } from './tuning-parts.js';
import { percentBonusFormula, attackDamageFormula, weaponDamageFormula, growthSettings, totalATKFormula, attackStatSettings, totalCritModFormula, bonusDamageTakenFormula, damageBonusFormula, damageReductionFormula, haloDamageFormula, damageModifiersFormula } from './game-config.js';
import { defaultCombatStats, combatBalance } from './game-config.js';
export { defaultCombatStats } from './game-config.js';
// Percent bonuses: zero keeps base values. CRIT is a direct chance percentage.


/** Initialize independent per-character combat stats without resetting upgrades. */
export function ensureCombatStats(character) {
  character.combatStats ??= {};
  character.combatStats.damageBonusMultipliers ??= [];
  for (const [key, value] of Object.entries(defaultCombatStats)) character.combatStats[key] ??= key==='critPercent'?(character.baseCritPercent??value):value;
  return character.combatStats;
}

/** Convert a bonus percentage to a multiplier (25% means 1.25 times base). */
export function statMultiplier(character, key) {
  const value = Number(ensureCombatStats(character)[key]);
  if (key === 'atkPercent') return totalCharacterATK(character) / 100;
  return percentBonusFormula(value+(key==='spdPercent'?(character.baseSPD??100)-100:0)+(key==='spdPercent'&&character.tuningParts?tuningPerk(character.tuningParts,'characterSpeedPercent'):0));
}

/** Roll per-hit critical chance; target debuffs add percentage points before clamping. */
export function rollAttackDamage(character, totalWeaponDamage, random = Math.random,
  { damageMod = 1, forceCritical = false, targetCritBonus = 0, criticalMultiplier, weaponCritDamagePercent = 0, target, weaponId, skillAttack = false } = {}) {
  const stats = ensureCombatStats(character);
  const buffs=Object.values(character.combatBuffs||{}).filter(Boolean);
  const bonusCrit=buffs.reduce((sum,buff)=>sum+(Number(buff.critPercent)||0),0);
  const critical = forceCritical || random() < Math.max(0, Math.min(100, stats.critPercent + bonusCrit + targetCritBonus + sportsDrinkCritBonus(character) - itemCritPenalty(character) + startingWeaponTuning(character,weaponId,'critChancePercent'))) / 100;
  const combinedModifier = damageModifiersFormula({
    criticalMultiplier: critical ? characterCriticalMultiplier(character, criticalMultiplier, weaponCritDamagePercent + startingWeaponTuning(character,weaponId,'critDamagePercent')) : 1,
    bonusDamageTaken: bonusDamageTakenFormula([].concat(target?.bonusDamageTakenPercent??[],target?.weakRemaining>0?target.weakDefensePercent:0)),
    DB: damageBonusFormula([...stats.damageBonusMultipliers,itemDamageBonus(character),...buffs.map(buff=>buff.damageBonusMultiplier).filter(Number.isFinite)]),
    DR: damageReductionFormula(target?.damageReductionPercent ?? []),
    halo: characterHaloMultiplier(character, target),
    attackModifier: damageMod*(skillAttack?itemSkillDamageMultiplier(character):1) // Attack-specific effects, including EX drawing accuracy.
  });
  return { damage: attackDamageFormula(totalWeaponDamage, totalCharacterATK(character), combinedModifier, random),
    critical, type: critical ? (characterCriticalMultiplier(character)>=2?'orangecritical':'critical') : 'normal' };
}

/** Parts affect only the explicitly identified character starting weapon. */
export function startingWeaponTuning(character,weaponId,key) {
  const main=character.mainWeaponId??(character.label==='Plana'?'plana-umbrella':null);
  return main&&weaponId===main&&character.tuningParts?tuningPerk(character.tuningParts,key):0;
}

/** Build weapon damage with independent level bonuses and optional purchased Growth.
 * mainWeaponId can explicitly identify a character main weapon; Plana defaults to her umbrella.
 */
export function totalWeaponDamage(character, weaponId, base, bonusesPercent = [], options = {}) {
  const mainWeaponId = character.mainWeaponId ?? (character.label === 'Plana' ? 'plana-umbrella' : null);
  const weapon=character.attackSlots?.find(item=>item?.id===weaponId);
  const soloBonus=character.tuningParts&&options.soloTuningEligible!==false&&weapon?.soloTuningEligible!==false?startingWeaponTuning(character,weaponId,'soloDamagePerEmptyPercent')*emptyWeaponSlotCount(character):0;
  return weaponDamageFormula(base, [...bonusesPercent,startingWeaponTuning(character,weaponId,'damagePercent'),-startingWeaponTuning(character,weaponId,'weaponDamagePenaltyPercent'),soloBonus,character.tuningParts&&stationaryTuningActive(character)?startingWeaponTuning(character,weaponId,'stationaryDamagePercent'):0,character.tuningParts?weaponTuningDamageBonus(character,weaponId):0], {
    ...options, projectileCount:character.tuningParts?startingWeaponProjectileCount(character,weaponId,options.projectileCount??weapon?.attackCount??1):(options.projectileCount??weapon?.attackCount??1), enhancementRank:weapon?.enhancementRank ?? 0, growthEligible: weaponId === mainWeaponId,
    growthRank: options.growthEligible===false?0:(character.growthRank ?? growthSettings.defaultRank), playerLevel: character.level ?? 1
  });
}


/** Add the accumulated item/skill ATK bonus to the character's independent base ATK. */
export function totalCharacterATK(character) {
  return totalATKFormula(character.baseATK ?? attackStatSettings.baseATK,
    [Number(ensureCombatStats(character).atkPercent),overclockingStats(character).atk,...Object.values(character.combatBuffs||{}).map(buff=>Number(buff?.atkPercent)||0)]);
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
