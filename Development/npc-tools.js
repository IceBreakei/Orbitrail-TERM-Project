import { updateNpcContact, contactSettings } from './npc-contact.js';
import { getEnemyDeaths, updateEnemyDeaths } from './enemy-death.js';
import { normalSpriteSize } from './scene-metrics.js';
import { advanceDamageFlash } from './damage-feedback.js';
import { rememberEnemy, getAllEnemies, getEnemy, damageEnemy, removeEnemy } from './world-state.js';
import { pointerToCanvas } from './aiming.js';

/** Install session-only NPC spawning, inspection, deletion, and basic test AI. */
export function createNpcTools({ canvas, characters, camera, getPlayer, isVertical = () => false,
  isFreeScroll = () => false, isPlacementClear = () => true,
  updateCharacter, drawCharacter, moveNpcBy }) {
  const panel = document.querySelector('#npc-tools');
  for (const [id, key] of [['contact-player-damage', 'playerDamage'], ['contact-enemy-damage', 'enemyDamage']]) {
    document.getElementById(id).addEventListener('change', event => {
      const value = Number(event.target.value);
      if (Number.isFinite(value) && value >= 1 && value <= 1000000) contactSettings[key] = Math.floor(value);
      event.target.value = contactSettings[key];
    });
  }
  const field = name => panel.querySelector(`[name="${name}"]`);
  const list = field('npc-selection');
  const feedback = document.querySelector('#npc-feedback');
  let counter = 0;
  let selectedId = '';
  let paused = false;
  let step = false;
  // Both backgrounds share one population: switching maps never replaces NPCs.
  const records = () => getAllEnemies();
  const visible = (margin = 160) => records().filter(npc =>
    npc.x >= camera.x - margin && npc.x <= camera.x + canvas.width + margin &&
    npc.y >= camera.y - margin && npc.y <= camera.y + canvas.height + margin);
  const cap = 200; // EDIT maximum session population to protect preview responsiveness.
  field('npc-type').addEventListener('change', () => {
    field('npc-exp').value = ['iroha', 'shiroko'].includes(field('npc-type').value) ? 50 : 5;
  });
  field('npc-exp').value = ['iroha', 'shiroko'].includes(field('npc-type').value) ? 50 : 5;

  /** Refresh selection only when population changes, retaining the current ID. */
  function refresh() {
    list.replaceChildren();
    for (const npc of records()) {
      const option = document.createElement('option');
      option.value = npc.id;
      option.textContent = `${npc.id} / ${npc.label}`;
      list.append(option);
    }
    if (!records().some(npc => npc.id === selectedId)) selectedId = records()[0]?.id || '';
    list.value = selectedId;
    feedback.textContent = `${records().length} NPCs / limit ${cap}. Shared across backgrounds; session-only state.`;
  }

  /** Clone an animation configuration into independent world-space NPC state. */
  function spawn(x, y) {
    if (getAllEnemies().length >= cap) {
      feedback.textContent = `Population limit (${cap}) reached. Delete NPCs before spawning more.`;
      return;
    }
    const type = field('npc-type').value;
    const template = characters[type];
    const size = template.spriteSize || normalSpriteSize;
    if (!isPlacementClear(template, x, y)) return false;
    const npc = rememberEnemy(`npc-${++counter}`, {
      ...template, type,
      x: isVertical() ? Math.max(camera.x + size / 2, Math.min(camera.x + canvas.width - size / 2, x)) : x,
      y: isVertical() || isFreeScroll() ? y : Math.max(camera.y + size / 2, Math.min(camera.y + canvas.height - size / 2, y)),
      direction: template.defaultDirection || 'down', facing: template.defaultDirection || 'left',
      moving: false, elapsed: 0, attack: null, transition: null, lastPose: null,
      movementSpeedMultiplier: 2 / 3, // All test NPCs use 120 px/s; players remain at 240.
      ai: field('npc-ai').checked, behavior: field('npc-behavior').value,
      wanderTimer: 0, wanderDirection: undefined, hp: 100, maxHp: 100, invincible: false,
      // EDIT the spawn reward here or use the admin field (boss default: 50).
      expReward: Math.max(0, Math.min(1000000, Math.floor(Number(field('npc-exp').value) || 0)))
    });
    selectedId = npc.id;
    return true;
  }

  /** Spawn a bounded batch in the current visible world area. */
  function spawnBatch(position) {
    const count = Math.max(1, Math.min(50, Number(field('npc-count').value) || 1));
    let missed = 0;
    for (let i = 0; i < count; i++) {
      let placed = false;
      for (let attempt = 0; attempt < (position ? 1 : 30); attempt++) {
        placed = spawn(position ? position.x : camera.x + 140 + Math.random() * Math.max(0, canvas.width - 280),
          position ? position.y : camera.y + 140 + Math.random() * Math.max(0, canvas.height - 280));
        if (placed || getAllEnemies().length >= cap) break;
      }
      if (!placed) missed++;
    }
    refresh();
    if (missed) feedback.textContent += ` ${missed} spawn(s) blocked by obstacles or population limit.`;
  }

  panel.querySelector('#spawn-npc').addEventListener('click', () => {
    if (field('npc-mode').value === 'random') spawnBatch();
    else feedback.textContent = 'Cursor spawn armed: left-click inside the game screen. Choose Inspect to stop spawning.';
  });
  list.addEventListener('change', () => { selectedId = list.value; });

  // Capture before aiming's click handler. NPC tool clicks never toggle aiming.
  canvas.addEventListener('click', event => {
    if (event.button !== 0) return;
    const mode = field('npc-mode').value;
    if (mode === 'random') return;
    event.stopImmediatePropagation();
    const point = pointerToCanvas(event.clientX, event.clientY,
      canvas.getBoundingClientRect(), canvas.width, canvas.height);
    point.x += camera.x;
    point.y += camera.y;
    if (mode === 'cursor') spawnBatch(point);
    else {
      const closest = records().filter(npc =>
        Math.hypot(npc.x - point.x, npc.y - point.y) < (npc.spriteSize || normalSpriteSize) / 2
      ).sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
      if (closest) {
        selectedId = closest.id;
        if (mode === 'delete') removeEnemy(selectedId);
        refresh();
      }
    }
  }, true);

  /** Dispatch selected-NPC and population actions from the admin panel. */
  panel.querySelectorAll('[data-npc-action]').forEach(button => {
    button.addEventListener('click', () => {
      const npc = getEnemy(selectedId);
      switch (button.dataset.npcAction) {
        case 'delete': if (npc) removeEnemy(npc.id); break;
        case 'clear': for (const entry of records()) removeEnemy(entry.id); break;
        case 'delete-visible':
          for (const entry of visible(0)) removeEnemy(entry.id);
          break;
        case 'apply-ai':
          if (npc) { npc.ai = field('npc-ai').checked; npc.behavior = field('npc-behavior').value; }
          break;
        case 'all-ai-on': for (const entry of records()) entry.ai = true; break;
        case 'all-ai-off': for (const entry of records()) entry.ai = false; break;
        case 'damage': if (npc) damageEnemy(npc.id, 25, getPlayer()); break;
        case 'heal': if (npc) npc.hp = npc.maxHp; break;
        case 'bring': if (npc) { npc.x = getPlayer().x + 160; npc.y = getPlayer().y; } break;
        case 'pause': paused = !paused; button.textContent = paused ? 'Resume AI' : 'Pause AI'; break;
        case 'step': step = true; paused = true; panel.querySelector('[data-npc-action="pause"]').textContent = 'Resume AI'; break;
      }
      refresh();
    });
  });

  /** Advance simple chase/wander AI; records stay alive even when off-screen. */
  function update(delta, playerMotion = { x: 0, y: 0 }) {
    updateEnemyDeaths(delta); // Finish visual fades even while AI is paused.
    const time = step ? 1 / 60 : paused ? 0 : delta;
    step = false;
    const player = getPlayer();
    // Tick once per simulation update, never once per enemy or contact check.
    player.contactIFrames = Math.max(0, (player.contactIFrames || 0) - time);
    const names = ['up', 'upRight', 'right', 'downRight', 'down', 'downLeft', 'left', 'upLeft'];
    for (const npc of records()) {
      advanceDamageFlash(npc, delta);
      if (npc.animationFrames) npc.gifElapsed = (npc.gifElapsed || 0) + delta * 1000;
      if (time && updateNpcContact(npc, player, playerMotion, time, moveNpcBy)) continue;
      let direction;
      let chaseTarget;
      if (time && npc.ai) {
        if (npc.behavior === 'chase') {
          const targetX = player.x + (npc.chaseOffsetX || 0);
          const targetY = player.y + (npc.chaseOffsetY || 0);
          const dx = targetX - npc.x, dy = targetY - npc.y;
          // Chase the center exactly; quantize only the animation facing.
          // Physical movement uses the full target vector, including small gaps.
          if (dx !== 0 || dy !== 0) {
            const angle = Math.atan2(dx, -dy);
            direction = names[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
            chaseTarget = { x: targetX, y: targetY };
          }
        } else if (npc.behavior === 'wander') {
          npc.wanderTimer -= time;
          if (npc.wanderTimer <= 0) {
            npc.wanderTimer = 0.8 + Math.random() * 1.5;
            npc.wanderDirection = names[Math.floor(Math.random() * names.length)];
          }
          direction = npc.wanderDirection;
        }
      }
      if (time) {
        if (npc.transition) npc.transition.elapsed += time * 1000;
        updateCharacter(npc, time, direction, chaseTarget);
        // A chasing NPC can reach contact during this step, even with a stationary player.
        updateNpcContact(npc, player, playerMotion, 0, moveNpcBy);
      }
    }
    const selected = getEnemy(selectedId);
    document.querySelector('#npc-inspector').textContent = selected
      ? `${selected.id} | X ${selected.x.toFixed(1)} Y ${selected.y.toFixed(1)} | HP ${selected.hp}/${selected.maxHp} | AI ${selected.ai ? selected.behavior : 'off'}`
      : 'No NPC selected.';
  }

  /** Cull rendering only; sprite outlines use the shared Sprite Bounds toggle. */
  function draw() {
    const remnants = getEnemyDeaths().filter(npc =>
      npc.x >= camera.x - 300 && npc.x <= camera.x + canvas.width + 300 &&
      npc.y >= camera.y - 300 && npc.y <= camera.y + canvas.height + 300);
    for (const npc of [...visible(300), ...remnants].sort((a, b) => a.y - b.y)) {
      drawCharacter(npc);
    }
  }

  refresh();
  return { update, draw };
}
