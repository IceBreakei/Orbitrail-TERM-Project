import { bossChanceFormula, bossPityThresholds, enemyTypeStats, eventTriggerSettings } from './game-config.js';
import { bossSpawnSettings } from './game-config.js';
export { bossSpawnSettings } from './game-config.js';
import { bossSpriteSize } from './scene-metrics.js';
import { getAllEnemies, isBossEnemy, onEnemySpawn, onEnemyDefeat } from './world-state.js';
import { offscreenSpawnPoint } from './playtest-spawner.js';



/** Endless kill totals are separate from the boss-charge counter. */
export function bossWaveLimit(endlessKills) {
  return endlessKills >= bossSpawnSettings.thirdBossUnlockKills
    ? bossSpawnSettings.unlockedWaveSize : bossSpawnSettings.waveSize;
}

/** Pick distinct bosses only; missing future roster entries never become duplicates. */
export function selectBossWave(stage, endless, endlessKills, roster, random = Math.random) {
  const available = [...new Set(roster)];
  if (!endless) {
    const preferred = bossTypeForStage(stage, random);
    return available.includes(preferred) ? [preferred] : available.slice(0, 1);
  }
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, bossWaveLimit(endlessKills));
}

/** Stage 1 always uses Shiroko; unassigned stages retain the current test roster. */
export function bossTypeForStage(stage, random = Math.random) {
  return stage.id === 'first' ? 'shiroko' : random() < 0.5 ? 'iroha' : 'shiroko';
}

/** Chance per eligible kill; switch to the shorter pity curve at 5 minutes after Stage 4. */
export function bossChance(kills, endlessSeconds = null) {
  return bossChanceFormula(kills, endlessSeconds);
}

/** Keep progression separate from total run kills and freeze it while bosses live. */
export function createBossCharge(random = Math.random, getEndlessSeconds = () => null) {
  let kills = 0, pending = false;
  return {
    recordDefeat(bossWasAlive) {
      if (bossWasAlive || pending) return;
      kills++;
      const chance = bossChance(kills, getEndlessSeconds());
      if (chance > 0 && (chance >= 1 || random() < chance)) pending = true;
    },
    // Reaching 5 endless minutes can make the existing kill count immediately guaranteed.
    refresh(bossAlive = false) {
      if (!bossAlive && kills >= bossPityThresholds(getEndlessSeconds()).guaranteedKills) pending = true;
    },
    get thresholds() { return bossPityThresholds(getEndlessSeconds()); },
    reset() { kills = 0; pending = false; },
    get kills() { return kills; },
    get pending() { return pending; },
    get chance() { return bossChance(kills, getEndlessSeconds()); }
  };
}

/** Spawn an offscreen chasing boss after a successful kill roll, retrying blocked spots. */
export function createBossSpawner({ canvas, camera, getStage, spawnBoss, slotsRemaining, onSpawn, isEndless,
  getSurvivalSeconds = () => 0, automaticEnabled = () => true, getBossTypes = () => ['shiroko', 'iroha'], getEndlessSeconds = () => null, canSpawnWave = () => true }) {
  const charge = createBossCharge(Math.random, getEndlessSeconds);
  const status = document.querySelector('#boss-spawn-status');
  const details = document.querySelector('#boss-spawn-details');
  let retry = 0;
  let endlessKills = 0;
  let waveQueue = [];
  let firstBossSpawned = false;
  const timedFirstStage = () => !isEndless() && getStage().id === 'first';

  function updateStatus() {
    const alive = getAllEnemies().filter(isBossEnemy).length;
    const state = alive ? `Frozen: ${alive} boss alive.` : !eventTriggerSettings.enabled && !waveQueue.length ? 'Legacy automatic event triggers disabled.' : timedFirstStage() && !waveQueue.length ? 'Shiroko scheduled at 05:00.' : alive ? `Frozen: ${alive} boss alive.` : waveQueue.length || charge.pending ? 'Boss wave ready.'
      : `${(charge.chance * 100).toFixed(2)}% chance per kill.`;
    const text = `Boss charge: ${charge.kills}/${charge.thresholds.guaranteedKills}\n${state}\n${isEndless() ? `Endless kills: ${endlessKills}` : 'Stages 1–4'}`;
    if (status.textContent !== text) status.textContent = text;
    if (details) details.textContent = `Boss wave: ${isEndless() ? Math.min(bossWaveLimit(endlessKills), new Set(getBossTypes()).size) : 1}. Unlocked slots: ${isEndless() ? bossWaveLimit(endlessKills) : 1}. Pity starts: ${charge.thresholds.pityStart} kills. Unique boss types: ${new Set(getBossTypes()).size}. Waiting to place: ${waveQueue.length}.`;
  }
  const stopSpawn = onEnemySpawn(enemy => {
    if (isBossEnemy(enemy)) {
      if (timedFirstStage() && enemy.type === 'shiroko') firstBossSpawned = true;
      charge.reset();
      waveQueue = waveQueue.filter(type => type !== enemy.type);
      updateStatus();
    }
  });
  const stopDefeat = onEnemyDefeat(({ bossesAliveBefore }) => {
    if (isEndless()) endlessKills++;
    if (eventTriggerSettings.enabled && !timedFirstStage()) charge.recordDefeat(bossesAliveBefore > 0 || waveQueue.length > 0);
    updateStatus();
  });

  /** Keep guaranteed spawns pending until a valid offscreen spot and slot exist. */
  function update(delta) {
    if (eventTriggerSettings.enabled && !timedFirstStage()) charge.refresh(getAllEnemies().some(isBossEnemy) || waveQueue.length > 0);
    updateStatus();
    retry = Math.max(0, retry - delta);
    if (retry > 0 || slotsRemaining() <= 0) return;
    if (!waveQueue.length) {
      if (!eventTriggerSettings.enabled) return;
      if (!canSpawnWave()) return;
      if (getAllEnemies().some(isBossEnemy)) return;
      if (timedFirstStage()) {
        if (firstBossSpawned || !automaticEnabled() || getSurvivalSeconds() < enemyTypeStats.shiroko.spawnAtSeconds) return;
      } else if (!charge.pending) return;
      waveQueue = selectBossWave(getStage(), isEndless(), endlessKills, getBossTypes());
    }
    if (!waveQueue.length) return;
    retry = bossSpawnSettings.retryInterval;
    const stage = { ...getStage(), spawnMargin: 150, spawnRadius: bossSpriteSize / 2 };
    let spawned = false;
    for (const type of [...waveQueue]) {
      if (slotsRemaining() <= 0) break;
      if (getAllEnemies().some(enemy => isBossEnemy(enemy) && enemy.type === type)) {
        waveQueue = waveQueue.filter(entry => entry !== type);
        continue;
      }
      for (let attempt = 0; attempt < bossSpawnSettings.placementAttempts; attempt++) {
        const point = offscreenSpawnPoint(stage, camera, canvas.width, canvas.height);
        if (point && spawnBoss(type, point.x, point.y)) {
          waveQueue = waveQueue.filter(entry => entry !== type);
          charge.reset();
          spawned = true;
          break;
        }
      }
    }
    if (spawned) onSpawn();
    updateStatus();
  }
  updateStatus();
  return { update,
    requestWave() {
      if (getAllEnemies().some(isBossEnemy) || waveQueue.length) return false;
      waveQueue = selectBossWave(getStage(), isEndless(), endlessKills, getBossTypes());
      charge.reset();
      retry = 0;
      return waveQueue.length > 0;
    },
    get hasPendingWave() { return waveQueue.length > 0; },
    get endlessKills() { return endlessKills; }, dispose() { stopSpawn(); stopDefeat(); } };
}
