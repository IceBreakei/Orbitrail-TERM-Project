import { basicMobHpFormula, eliteChanceFormula } from './game-config.js';
import { standardEnemyWeights, enemyStagePools, enemyTypeStats, playerSettings, enemyStatsScalingFormula, campaignScalingTimeFormula } from './game-config.js';
import { combatBalance } from './game-config.js';
import { eliteSizeMultiplier, eliteChance, mobBaseHp, shirokoBossStats } from './game-config.js';
export { eliteSizeMultiplier, eliteChance, mobBaseHp, shirokoBossStats } from './game-config.js';
import { normalSpriteSize } from './scene-metrics.js';

// Elite size, HP and spawn chance are configured in game-config.js.





/** Roll basic-enemy elites; bosses and playable-character test NPCs are excluded. */
export function enemyVariant(type, template, mode = 'random', random = Math.random, survivalSeconds = 0, endlessSeconds = null, eliteProbability = eliteChanceFormula(endlessSeconds)) {
  const elite = template.miniBoss === true || type === 'midori' || (type === 'mob' || template.standard) && (mode === 'elite' || (mode === 'random' && random() < eliteProbability));
  const baseHp = (['mob', 'midori'].includes(type) || template.standard) ? basicMobHpFormula(survivalSeconds)
    : type === 'shiroko' ? mobBaseHp * shirokoBossStats.hpMultiplier : combatBalance.otherEnemyHp;
  const megaType = type === 'megaMob' || (type === 'mob' && elite) ? 'megaMob' :
    type === 'megaSweeper' || (['whiteSweeper','heavySweeper'].includes(type) && elite) ? 'megaSweeper' : null;
  const dedicatedMega = Boolean(megaType);
  const profile = enemyTypeStats[megaType || type];
  const scaled = profile ? enemyStatsScalingFormula(profile, campaignScalingTimeFormula(endlessSeconds)) : null;
  const maxHp = (scaled?.hp ?? baseHp) * (elite && !dedicatedMega ? combatBalance.eliteHpMultiplier : 1);
  return {
    elite,
    miniBoss: template.miniBoss === true || (elite && type !== 'midori'),
    label: dedicatedMega ? (megaType === 'megaSweeper' ? 'Mega Sweeper' : 'Mega Mob') : elite && type !== 'midori' ? `Mega ${template.label}` : template.label,
    spriteSize: (template.spriteSize || normalSpriteSize) * (elite && type !== 'midori' && !template.miniBoss ? (template.megaSizeMultiplier ?? eliteSizeMultiplier) : 1),
    hp: maxHp,
    maxHp,
    contactDamage: type === 'shiroko' ? shirokoBossStats.contactDamage : template.contactDamage,
    contactDamageMultiplier: elite && !dedicatedMega ? 2 : 1,
    ...(profile ? { hp: Math.round(maxHp), maxHp: Math.round(maxHp), perTypeStats: true,
      contactDamage: scaled.atk, expReward: profile.expValue,
      movementSpeedMultiplier: scaled.spd * playerSettings.speed / playerSettings.movementBase } : {})
  };
}

/** Pick from the configured standard enemy pool while keeping Mob most common. */
export function chooseStandardEnemy(random = Math.random, elapsedSeconds = 0, stageId = null) {
  const weights = stageId && enemyStagePools[stageId] ? Object.fromEntries(enemyStagePools[stageId].map(type=>[type,1])) : standardEnemyWeights;
  const entries = Object.entries(weights).filter(([type, weight]) => {
    const profile = enemyTypeStats[type];
    return weight > 0 && (!profile || (elapsedSeconds >= profile.spawnStartSeconds && elapsedSeconds < profile.spawnEndSeconds));
  });
  let roll = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [type, weight] of entries) { roll -= weight; if (roll < 0) return type; }
  return entries.at(-1)?.[0] ?? null;
}
