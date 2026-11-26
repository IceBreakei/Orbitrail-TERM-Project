import { developmentSettings } from './game-config.js';
import { spawnRateFormula } from './game-config.js';
import { playtestSpawnSettings } from './game-config.js';
export { playtestSpawnSettings } from './game-config.js';
import { isBossEnemy } from './world-state.js';
import { normalSpriteSize } from './scene-metrics.js';



/** Count enemies whose sprite area intersects the actual gameplay viewport. */
export function visibleEnemyCount(enemies, camera, width, height) {
  return visibleEnemies(enemies, camera, width, height).length;
}

/** Share visibility checks between the displayed headcount and weighted cap usage. */
function visibleEnemies(enemies, camera, width, height) {
  return enemies.filter(enemy => {
    const radius = (enemy.spriteSize || 112) / 2;
    return enemy.x + radius >= camera.x && enemy.x - radius <= camera.x + width &&
      enemy.y + radius >= camera.y && enemy.y - radius <= camera.y + height;
  });
}

/** Elites consume three on-screen slots; ordinary actors consume one. */
export function visibleEnemySlots(enemies, camera, width, height) {
  return visibleEnemies(enemies, camera, width, height).reduce((total, enemy) =>
    total + (enemy.elite ? playtestSpawnSettings.eliteVisibleSlots : 1), 0);
}

/** Increase arrivals from 5 to 8/s as the crowd within 400px becomes sparse. */
export function adaptiveSpawnRate(enemies, player, visible) {
  if (visible >= playtestSpawnSettings.visibleLimit) return playtestSpawnSettings.crowdedPerSecond;
  const nearby = enemies.filter(enemy =>
    Math.hypot(enemy.x - player.x, enemy.y - player.y) <= playtestSpawnSettings.nearbyRadius).length;
  return spawnRateFormula(nearby, visible);
}

/** Rank legal entrances by enemy count relative to the player; randomize ties. */
export function leastCrowdedSides(stage, enemies, player, random = Math.random) {
  const sides = stage.availableSides || ['left', 'right', 'top', 'bottom'];
  const counts = Object.fromEntries(sides.map(side => [side, 0]));
  for (const enemy of enemies) {
    const dx = enemy.x - player.x, dy = enemy.y - player.y;
    if (dx === 0 && dy === 0) continue;
    // Count by actual direction, including short-axis entrances on strip maps.
    const directions = { left: [-1,0], right: [1,0], top: [0,-1], bottom: [0,1] };
    const side = sides.map(side => ({ side, score: dx * directions[side][0] + dy * directions[side][1] }))
      .sort((a,b) => b.score - a.score)[0]?.side;
    if (!side) continue;
    counts[side]++;
  }
  return sides.map(side => ({ side, count: counts[side], tie: random() }))
    .sort((a, b) => a.count - b.count || a.tie - b.tie).map(entry => entry.side);
}

/** Balance successful arrivals across all usable edges, with crowd density breaking ties. */
export function rankSpawnEntrances(stage, enemies, player, arrivals, random = Math.random) {
  const ranked = leastCrowdedSides(stage, enemies, player, random);
  if (playtestSpawnSettings.distribution === 'leastCrowded') return ranked;
  const densityRank = Object.fromEntries(ranked.map((side,index) => [side,index]));
  return [...ranked].sort((a,b) => (arrivals[a] || 0) - (arrivals[b] || 0) || densityRank[a] - densityRank[b]);
}

/** Reserve at most three arrivals per rolling second ahead; overflow uses cross-axis edges. */
export function createRunningSpawnRouter() {
  let seconds = 0, forwardCredit = 0, currentForward;
  let arrivals = [];
  return {
    advance(delta) {
      seconds += Math.max(0, delta);
      forwardCredit = Math.min(1, forwardCredit + Math.max(0, delta) * playtestSpawnSettings.forwardPerSecond);
      arrivals = arrivals.filter(entry => seconds - entry.seconds < 1 - 1e-8);
    },
    rank(ranked, motion) {
      currentForward = undefined;
      if (!motion || Math.hypot(motion.x, motion.y) < .001) return ranked;
      // Diagonal runs use their dominant axis; ties use X consistently.
      const horizontal = Math.abs(motion.x) >= Math.abs(motion.y);
      const forward = horizontal ? motion.x > 0 ? 'right' : 'left' : motion.y > 0 ? 'bottom' : 'top';
      currentForward = forward;
      const cross = ranked.filter(side => horizontal ? ['top', 'bottom'].includes(side) : ['left', 'right'].includes(side));
      const aheadCount = arrivals.filter(entry => entry.side === forward).length;
      const canSpawnAhead = aheadCount < playtestSpawnSettings.forwardPerSecond;
      if (cross.length) {
        // Do not fall back into the escape route when its allotted share is exhausted.
        return canSpawnAhead && forwardCredit >= 1 && ranked.includes(forward)
          ? [forward, ...cross] : cross;
      }
      // Strip maps may expose only the running axis: allow rear arrivals, cap the front.
      const rear = ranked.filter(side => side !== forward);
      return canSpawnAhead && forwardCredit >= 1 && ranked.includes(forward)
        ? [forward, ...rear] : rear;
    },
    record(side) {
      arrivals.push({ side, seconds });
      if (side === currentForward) forwardCredit = 0;
    }
  };
}

/** Pressure the escape route opposite the nearest boss, within legal map entrances. */
export function oppositeBossSide(stage, enemies, player, random = Math.random) {
  const boss = enemies.filter(isBossEnemy).sort((a,b) =>
    Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
  if (!boss) return undefined;
  const dx = player.x - boss.x, dy = player.y - boss.y;
  if (!dx && !dy) return undefined;
  const allowed = stage.availableSides || ['left', 'right', 'top', 'bottom'];
  const directions = [['left',-1,0],['right',1,0],['top',0,-1],['bottom',0,1]]
    .filter(([side]) => allowed.includes(side));
  if (!directions.length) return undefined;
  return directions.map(([side,x,y]) => ({ side, score: dx*x+dy*y, tie: random() }))
    .sort((a,b) => b.score-a.score || a.tie-b.tie)[0].side;
}

/** Build entrances only where a whole sprite fits offscreen inside map limits. */
function offscreenEntrances(stage, camera, width, height) {
  const bounds = stage.playableBounds || {};
  const radius = stage.spawnRadius ?? normalSpriteSize / 2;
  const margin = Math.max(radius + 1, stage.spawnMargin ?? playtestSpawnSettings.offscreenMargin);
  const left = (bounds.left ?? -Infinity) + radius;
  const right = (bounds.right ?? Infinity) - radius;
  const top = (bounds.top ?? -Infinity) + radius;
  const bottom = (bounds.bottom ?? Infinity) - radius;
  const xMin = Math.max(camera.x, left), xMax = Math.min(camera.x + width, right);
  const yMin = Math.max(camera.y, top), yMax = Math.min(camera.y + height, bottom);
  const entries = [];
  if (yMin <= yMax) {
    if (left <= camera.x - radius - 1) entries.push({ side: 'left', x: Math.max(left, camera.x - margin), yMin, yMax });
    if (right >= camera.x + width + radius + 1) entries.push({ side: 'right', x: Math.min(right, camera.x + width + margin), yMin, yMax });
  }
  if (xMin <= xMax) {
    if (top <= camera.y - radius - 1) entries.push({ side: 'top', y: Math.max(top, camera.y - margin), xMin, xMax });
    if (bottom >= camera.y + height + radius + 1) entries.push({ side: 'bottom', y: Math.min(bottom, camera.y + height + margin), xMin, xMax });
  }
  return entries;
}

/** Expose currently usable directions to crowd and boss-pressure ranking. */
export function offscreenSpawnSides(stage, camera, width, height) {
  return offscreenEntrances(stage, camera, width, height).map(entry => entry.side);
}

/** Choose a fully offscreen point; NPC placement additionally validates island shoreline. */
export function offscreenSpawnPoint(stage, camera, width, height, random = Math.random, preferredSide) {
  const entries = offscreenEntrances(stage, camera, width, height);
  const entry = preferredSide ? entries.find(candidate => candidate.side === preferredSide)
    : entries[Math.floor(random() * entries.length)];
  if (!entry) return null;
  return { x: entry.x ?? entry.xMin + random() * (entry.xMax - entry.xMin),
    y: entry.y ?? entry.yMin + random() * (entry.yMax - entry.yMin) };
}

/** Stream individual arrivals with density-based direction priority and no catch-up bursts. */
export function createPlaytestSpawner({ canvas, camera, getStage, spawnEnemy, slotsRemaining, onBatch, getEnemies, getPlayer, getSpawnRate = rate => rate }) {
  const button = document.querySelector('#toggle-random-spawning');
  const status = document.querySelector('#random-spawn-status');
  let running = developmentSettings.randomSpawning; // Development starts idle until explicitly enabled.
  let elapsed = 0;
  let lastStatus = '';
  let entranceSignature = '';
  let arrivals = {}; // Successful spawns, reset whenever the usable entrance set changes.
  let nextArrival = 1; // Accumulated spawn credit; rate changes do not restart the timer.
  const runningRouter = createRunningSpawnRouter();

  /** Slow new arrivals when the visible crowd reaches the testing threshold. */
  function crowdState() {
    const enemies = getEnemies();
    const visible = visibleEnemySlots(enemies, camera, canvas.width, canvas.height);
    const count = visibleEnemyCount(enemies, camera, canvas.width, canvas.height);
    // The weighted cap also applies during event spawn-rate boosts.
    const rate = visible >= playtestSpawnSettings.visibleLimit ? playtestSpawnSettings.crowdedPerSecond
      : getSpawnRate(adaptiveSpawnRate(enemies, getPlayer(), visible));
    return { visible, count, rate };
  }

  /** Keep the sidebar button explicit about the next available action. */
  function updateControls(message = '') {
    button.textContent = running ? 'Stop random spawning' : 'Start random spawning';
    button.setAttribute('aria-pressed', String(running));
    const crowd = crowdState();
    status.textContent = `${running ? 'Spawning' : 'Stopped'}: ${crowd.rate}/s\nOn-screen slots: ${crowd.visible}/${playtestSpawnSettings.visibleLimit} (${crowd.count} enemies)\n${message || 'Offscreen chase spawns'}`;
    lastStatus = `${running}:${crowd.rate}:${crowd.visible}:${crowd.count}`;
  }
  button.addEventListener('click', () => {
    running = !running;
    elapsed = 0;
    updateControls();
  });

  /** Emit at most one arrival per frame, with small timing variation around the current rate. */
  function update(delta, playerMotion) {
    const crowd = crowdState();
    if (lastStatus !== `${running}:${crowd.rate}:${crowd.visible}:${crowd.count}`) updateControls();
    if (!running) return;
    runningRouter.advance(Math.min(.1, Math.max(0, delta)));
    // Discard long stalls instead of catching up with a wave after a suspended tab.
    elapsed += Math.min(0.1, Math.max(0, delta)) * crowd.rate;
    if (elapsed < nextArrival) return;
    elapsed = Math.min(0.5, elapsed - nextArrival);
    nextArrival = 1 + (Math.random() * 2 - 1) * playtestSpawnSettings.streamJitter;
    if (slotsRemaining() <= 0) return;
    const stage = getStage();
    const enemies = getEnemies(), player = getPlayer();
    const legalSides = offscreenSpawnSides(stage, camera, canvas.width, canvas.height);
    if (!legalSides.length) return;
    const signature = `${stage.id || stage.axis}:${[...legalSides].sort().join(',')}`;
    if (signature !== entranceSignature) { entranceSignature = signature; arrivals = {}; }
    const ranked = rankSpawnEntrances({ ...stage, availableSides: legalSides }, enemies, player, arrivals);
    const preferred = playtestSpawnSettings.distribution !== 'leastCrowded' ||
      Math.random() < playtestSpawnSettings.leastCrowdedChance
      ? ranked[0] : legalSides[Math.floor(Math.random() * legalSides.length)];
    const sides = runningRouter.rank([preferred, ...ranked.filter(side => side !== preferred)], playerMotion);
    if (!sides.length) return;
    const attemptsPerSide = Math.ceil(playtestSpawnSettings.placementAttempts / sides.length);
    for (let attempt = 0; attempt < playtestSpawnSettings.placementAttempts; attempt++) {
      const side = sides[Math.min(sides.length - 1, Math.floor(attempt / attemptsPerSide))];
      const point = offscreenSpawnPoint(stage, camera, canvas.width, canvas.height, Math.random, side);
      if (point && spawnEnemy(point.x, point.y)) {
        arrivals[side] = (arrivals[side] || 0) + 1;
        runningRouter.record(side);
        onBatch(); // Refresh admin records only when an enemy is actually created.
        updateControls('Staggered arrivals');
        break;
      }
    }
  }
  updateControls();
  return { update, setRunning(enabled) { running = Boolean(enabled); elapsed = 0; updateControls(); }, get running() { return running; } };
}
