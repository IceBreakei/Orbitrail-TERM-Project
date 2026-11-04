import { enemyLevelPreset, enemyStatsScalingFormula, campaignScalingTimeFormula, combatBalance } from './game-config.js';

/** BENCHED reference helper; not connected to live spawning or minute updates. */
export function stageEnemyStats(stageLevel, endlessSeconds = null, elite = false) {
  const base = enemyLevelPreset(stageLevel);
  const scaled = enemyStatsScalingFormula(base, campaignScalingTimeFormula(endlessSeconds));
  return {
    stageEnemyLevel:stageLevel, stageScaled:true,
    maxHp:Math.round(scaled.hp * (elite ? combatBalance.eliteHpMultiplier : 1)),
    contactDamage:scaled.atk, contactDamageMultiplier:elite ? 2 : 1,
    stageSpeedFactor:scaled.spd, expReward:base.expValue,
    knockbackImmune:base.knockbackImmune
  };
}
