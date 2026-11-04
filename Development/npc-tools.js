import { createBossBehaviors } from './boss-behaviors.js';
import { openAnimationLineup } from './animation-lineup.js';
import { createCampaignEvents, eventEnemyProfile } from './seeded-events.js';
import { runSeed } from './run-seed.js';
import { campaignEnemyOverrides } from './campaign-schedule.js';
import { offscreenEventPoint, createTimedEnemyEvents, clusterSpawnPoints, hordeMotion, wallSpawnPoints, timedEventStatOverrides, ringSpawnPoints, stampedeSpawnPoints } from './timed-enemy-events.js';
import { createMiniBossSchedule } from './mini-bosses.js';
import { createKnockbackMover, updateKnockbackResistance } from './knockback.js';
import { updateEnemyControl } from './enemy-control.js';
import { midoriSpeed, midoriChaseTarget } from './midori.js';
import { playerSettings, eliteSizeMultiplier, eventTriggerSettings, harmlessEnemySettings, harmlessHitsToDefeatFormula } from './game-config.js';
import { yuukaSettings, yuukaHealth, yuukaMotion, createYuukaSpawnCharge, updateYuukaPresence, canSpawnYuuka, createHarmlessSpawnSchedule } from './yuuka.js';
import { updateNpcContact, contactSettings } from './npc-contact.js';
import { enemyVariant, chooseStandardEnemy } from './enemy-variants.js';
import { getEnemyDeaths, updateEnemyDeaths, drawGachaDeaths } from './enemy-death.js';
import { normalSpriteSize } from './scene-metrics.js';
import { advanceDamageFlash } from './damage-feedback.js';
import { endEventEnemies, enemyRenderLayer, onEnemyDefeat, onEnemySpawn, enemyTestConfig, rememberEnemy, getAllEnemies, getEnemy, damageEnemy, removeEnemy, enemyPopulationSettings, despawnDistantEnemies, trimEnemyPopulation, isBossEnemy } from './world-state.js';
import { updateBossCatchup } from './boss-catchup.js';
import { pointerToCanvas } from './aiming.js';

/** Install session-only NPC spawning, inspection, deletion, and basic test AI. */
export function createNpcTools({ canvas, characters, camera, getPlayer, getPlayerDamage = () => 23, getSurvivalSeconds = () => 0, getEndlessSeconds = () => null, getEliteChance, campaignActive = () => false, getCampaignSpawn = () => null, getCampaignProfile = () => null, getStageId = () => null, getInternalSeconds = getSurvivalSeconds, getEventStage = getStageId, getStageSeconds = getSurvivalSeconds, timedSpawnsEnabled = () => true, isVertical = () => false,
  isFreeScroll = () => false, isPlacementClear = () => true, canKnockbackStand = () => true,
  updateCharacter, drawCharacter, baseMovementSpeed = 180, allowMultipleBosses = () => false, getBossLimit }) {
  const panel = document.querySelector('#npc-tools');
  panel.querySelector('#spawn-animation-lineup').addEventListener('click',()=>openAnimationLineup(characters));
  const yuukaCharge = createYuukaSpawnCharge();
  const harmlessSchedule = createHarmlessSpawnSchedule();
  const miniBossSchedule = createMiniBossSchedule();
  const formationWarnings = [];
  const bossBehaviors=createBossBehaviors();
  const formationPoints = event => {
    const template=characters[Array.isArray(event.enemy)?event.enemy[0]:event.enemy];
    if(!template)return null;
    const size=template.spriteSize || normalSpriteSize;
    const spacing=Math.min(size*.65,Math.min(canvas.width,canvas.height)*.55/Math.max(1,Math.ceil(Math.sqrt(event.count))-1));
    const extent=Math.ceil(Math.sqrt(event.count))*spacing/2+size/2+24;
    const player=getPlayer();
    if (event.pattern==='ring') {
      // Surround the entire viewport; map edges restrict entries to legal offscreen arcs.
      const viewport={x:camera.x,y:camera.y,width:canvas.width,height:canvas.height};
      const center={x:camera.x+canvas.width/2,y:camera.y+canvas.height/2};
      const legal=ringSpawnPoints(center,Math.max(400,event.count*8),1)
        .map(p=>offscreenEventPoint(p,viewport,size*(template.megaSizeMultiplier??eliteSizeMultiplier)))
        .filter(p=>isPlacementClear(template,p.x,p.y));
      if(legal.length) return Array.from({length:event.count},(_,i)=>legal[Math.floor(i*legal.length/event.count)]);
      return null;
    }
    if (event.pattern==='wall') {
      const margin=size/2+24;
      const bounds={left:camera.x-margin,right:camera.x+canvas.width+margin,
        top:camera.y+size/2,bottom:camera.y+canvas.height-size/2};
      // Prefer vertical walls, falling back to horizontal ones where the map has no side entry.
      for (const vertical of [true,false]) {
        const wallBounds=vertical?{...bounds}:{left:camera.x+size/2,right:camera.x+canvas.width-size/2,
          top:camera.y-margin,bottom:camera.y+canvas.height+margin};
        const samples=wallSpawnPoints(wallBounds,66,vertical);
        const first=samples.slice(0,33),second=samples.slice(33);
        const valid=first.map((p,i)=>isPlacementClear(template,p.x,p.y)&&isPlacementClear(template,second[i].x,second[i].y)?i:-1).filter(i=>i>=0);
        if(!valid.length) continue;
        const start=first[valid[0]],end=first[valid.at(-1)];
        if(vertical) {wallBounds.top=start.y;wallBounds.bottom=end.y;}
        else {wallBounds.left=start.x;wallBounds.right=end.x;}
        const points=wallSpawnPoints(wallBounds,event.count,vertical);
        if(points.every(p=>isPlacementClear(template,p.x,p.y))) return points;
      }
      return null;
    }
    const anchors=[{x:camera.x-extent,y:player.y},{x:camera.x+canvas.width+extent,y:player.y},
      {x:player.x,y:camera.y-extent},{x:player.x,y:camera.y+canvas.height+extent},
      {x:camera.x-extent,y:camera.y+canvas.height/2},{x:camera.x+canvas.width+extent,y:camera.y+canvas.height/2}];
    const firstAnchor=event.entrySide??0;
    for(const anchor of [...anchors.slice(firstAnchor),...anchors.slice(0,firstAnchor)]) {
      const points=['stampede','wave','fastball','ambush'].includes(event.pattern)?stampedeSpawnPoints(anchor,player,event.count,Math.min(spacing,Math.min(canvas.width,canvas.height)*.65/Math.max(1,event.count-1))):clusterSpawnPoints(anchor,event.count,spacing);
      if(points.every(p=>isPlacementClear(template,p.x,p.y))) {
        const chargeAngle=Math.atan2(player.y-anchor.y,player.x-anchor.x);
        return points.map(point=>({...point,chargeAngle}));
      }
    }
    return null;
  };
  const timedEvents = createTimedEnemyEvents(formationPoints,
    (event,point)=>spawn(point.x,point.y,{type:event.enemy,variant:'normal',ai:true,
      behavior:['horde','hordeRush','stampede','wave','fastball','ambush'].includes(event.pattern)?'horde':'chase',chargeAngle:point.chargeAngle,
      timedArrival:true,timedEvent:event,eventKey:event.id,automatic:true}), undefined,
    (event,points)=>{const center=points[Math.floor(points.length/2)];
      formationWarnings.push({x:center.x,y:center.y,angle:center.chargeAngle,expiresAt:event.timeSeconds});});
  const campaignEvents=createCampaignEvents({seed:runSeed,getPoints:formationPoints,
    spawn:(event,point)=>{
      const type=point.enemyType;
      const row=eventEnemyProfile(event,type,event.internalSeconds,event.stage);
      return spawn(point.x,point.y,{type,variant:'normal',ai:true,
        behavior:['horde','hordeRush','stampede','wave','fastball','ambush'].includes(event.pattern)?'horde':'chase',chargeAngle:point.chargeAngle,
        timedArrival:true,timedEvent:event,eventKey:event.groupId,automatic:true,
        campaignEntry:{row,mega:false,scheduled:false}});
    },onEnd:key=>endEventEnemies(key,getPlayer()),
    warn:(event,points,expiresAt)=>{const center=points[Math.floor(points.length/2)];
      formationWarnings.push({x:center.x,y:center.y,angle:center.chargeAngle||0,pattern:event.pattern,expiresAt,eventClock:true});}
  });
  const yuukaStatus = document.querySelector('#yuuka-spawn-status');
  /** Keep cooldown and pity visible in the collapsed admin details. */
  function updateYuukaStatus() {
    if (yuukaStatus) yuukaStatus.textContent = 'Yuuka: 30% at 3:00, 9:00 and 17:00. Sensei: admin spawn until timestamps are defined. Harmless enemies run away after 25s.';
  }
  onEnemyDefeat(() => { yuukaCharge.recordKill(); updateYuukaStatus(); });
  onEnemySpawn(enemy => {
    if (enemy.type === 'yuuka') yuukaCharge.recordSpawn();
    updateYuukaStatus();
  });
  updateYuukaStatus();
  const oneHpToggle = panel.querySelector('#enemy-one-hp');
  oneHpToggle.checked = enemyTestConfig.oneHp;
  oneHpToggle.disabled = true; // Read-only: this configuration follows admin seed 0.
  for (const [id, key] of [['contact-player-damage', 'playerDamage'], ['contact-mob-damage', 'mobDamage']]) {
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
  const moveKnockback = createKnockbackMover(records, canKnockbackStand);
  const visible = (margin = 160) => records().filter(npc =>
    npc.x >= camera.x - margin && npc.x <= camera.x + canvas.width + margin &&
    npc.y >= camera.y - margin && npc.y <= camera.y + canvas.height + margin);
  const cap = enemyPopulationSettings.limit;
  const eliteButton = panel.querySelector('#spawn-elite-npc');
  /** Mega variants currently exist for basic Mob enemies only. */
  function updateEliteButton() {
    eliteButton.disabled = !(field('npc-type').value === 'mob' || characters[field('npc-type').value]?.standard);
    eliteButton.title = eliteButton.disabled ? 'Mega variants are available for standard enemies.' : 'Spawn an Mega standard enemy';
  }
  field('npc-type').addEventListener('change', () => {
    field('npc-exp').value = ['iroha', 'shiroko'].includes(field('npc-type').value) ? 50 : 5;
    updateEliteButton();
  });
  field('npc-exp').value = ['iroha', 'shiroko'].includes(field('npc-type').value) ? 50 : 5;
  updateEliteButton();

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
  function spawn(x, y, options = {}) {
    if (getAllEnemies().length >= cap) {
      feedback.textContent = `Population limit (${cap}) reached. Delete NPCs before spawning more.`;
      return;
    }
    const type = options.type ?? field('npc-type').value;
    const template = characters[type];
    if(!template) return false;
    const campaignEntry=options.campaignEntry || (!options.automatic && getCampaignProfile(type)?{row:getCampaignProfile(type),mega:false,scheduled:false}:null);
    if (type === 'yuuka' && options.automatic && !canSpawnYuuka(records())) {
      feedback.textContent = 'Only one Yuuka can be alive at a time. Remove or defeat her before spawning another.';
      return false;
    }
    if (isBossEnemy({ ...template, type }) && (!campaignEntry || campaignEntry.row.kind === 'boss')) {
      const bosses = records().filter(isBossEnemy);
      const limit = getBossLimit ? getBossLimit() : allowMultipleBosses() ? Infinity : 1;
      if (bosses.some(enemy => enemy.type === type) || bosses.length >= limit) {
        feedback.textContent = 'Boss limit reached: one of each type, within the current wave size.';
        return false;
      }
    }
    const variant = enemyVariant(type, template, options.variant ?? field('npc-variant').value, Math.random, getSurvivalSeconds(), getEndlessSeconds(), getEliteChance?.());
    if (['yuuka','sensei'].includes(type)) {
      variant.hp = variant.maxHp = yuukaHealth(getPlayerDamage());
      variant.hitsToDefeat = harmlessEnemySettings[`${type}HitsToDefeat`] ??
        harmlessHitsToDefeatFormula(getPlayer().level ?? 1);
      variant.receivedHits = 0;
    }
    Object.assign(variant,timedEventStatOverrides(options.timedEvent,variant));
    if(campaignEntry) Object.assign(variant,campaignEnemyOverrides(campaignEntry,template,baseMovementSpeed));
    const size = variant.spriteSize;
    // Recheck at insertion time: the camera may have moved during warnings or capacity retries.
    if (options.timedEvent) {
      const point=offscreenEventPoint({x,y},{x:camera.x,y:camera.y,width:canvas.width,height:canvas.height},size);
      x=point.x; y=point.y;
    }
    x = !options.automatic && isVertical() ? Math.max(camera.x + size / 2, Math.min(camera.x + canvas.width - size / 2, x)) : x;
    y = options.automatic || isVertical() || isFreeScroll() ? y : Math.max(camera.y + size / 2, Math.min(camera.y + canvas.height - size / 2, y));
    if (!isPlacementClear({ ...template, ...variant }, x, y)) return false;
    const npc = rememberEnemy(`npc-${++counter}`, {
      ...template, type, eventKey: options.eventKey,
      x: !options.automatic && isVertical() ? Math.max(camera.x + size / 2, Math.min(camera.x + canvas.width - size / 2, x)) : x,
      y: options.automatic || isVertical() || isFreeScroll() ? y : Math.max(camera.y + size / 2, Math.min(camera.y + canvas.height - size / 2, y)),
      direction: template.defaultDirection || 'down', facing: template.defaultDirection || 'left',
      moving: false, elapsed: 0, attack: null, transition: null, lastPose: null,
      movementSpeedMultiplier: type === 'midori' ? midoriSpeed(getPlayer(), baseMovementSpeed) / baseMovementSpeed
        : ['yuuka','sensei'].includes(type) ? yuukaSettings.speed / baseMovementSpeed : playerSettings.npcSpeed / baseMovementSpeed,
      ai: options.ai ?? field('npc-ai').checked, behavior: ['yuuka','sensei'].includes(type) ? 'erratic' : options.behavior ?? field('npc-behavior').value,
      eventExpiresAt: !options.timedEvent?.runtimeManaged && options.timedEvent?.lifetimeSeconds != null ? options.timedEvent.timeSeconds+options.timedEvent.lifetimeSeconds : null,
      // Irrational per-spawn phases and slightly varied cadence keep group skipping staggered.
      bouncePhase:(counter*0.618033988749895)%1,
      bouncePeriodScale:.9+((counter*0.754877666246693)%1)*.2,
      eventPattern:options.timedEvent?.pattern, eventMotionAge:0, chargeWait:['fastball','ambush'].includes(options.timedEvent?.pattern)?.65:0,
      chargeAngle: options.chargeAngle, spawnArrivalPending: options.timedArrival === true, spawnArrivalGrace: 10,
      wanderTimer: 0, wanderDirection: undefined, invincible: false,
      combatStats: {}, // NPCs do not inherit the controlled avatar's test upgrades.
      ...variant,
      // Default rewards roll on defeat; explicit admin overrides remain available.
      expReward: !options.automatic && field('npc-exp-override').checked
        ? Math.max(0, Math.min(1000000, Math.floor(Number(field('npc-exp').value) || 0))) : variant.expReward
    });
    if (!options.automatic) selectedId = npc.id;
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

  /** Force the button's variant for random placement, or arm cursor placement. */
  function spawnFromButton(variant) {
    if (variant === 'elite' && !(field('npc-type').value === 'mob' || characters[field('npc-type').value]?.standard)) return;
    field('npc-variant').value = variant;
    if (field('npc-mode').value === 'random') spawnBatch();
    else {
      field('npc-mode').value = 'cursor';
      feedback.textContent = `${variant === 'elite' ? 'Mega' : 'Normal'} cursor spawn armed: left-click inside the game screen. Choose Inspect to stop spawning.`;
    }
  }
  panel.querySelector('#spawn-npc').addEventListener('click', () => spawnFromButton('normal'));
  eliteButton.addEventListener('click', () => spawnFromButton('elite'));
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
    bossBehaviors.updateEffects(time,player,records());
    campaignEvents.update(getInternalSeconds(),delta,{stage:getEventStage(),enabled:time>0&&timedSpawnsEnabled()});
    const eventStatus=document.querySelector('#campaign-event-status');
    if(eventStatus) eventStatus.textContent=`Events: ${campaignEvents.activeGroups} active groups. Seeded events: ${campaignEvents.generatedSlots}.`;
    if (eventTriggerSettings.enabled && time && timedSpawnsEnabled()) timedEvents.update(getSurvivalSeconds());
    if (eventTriggerSettings.enabled && time && timedSpawnsEnabled()) miniBossSchedule.update(getSurvivalSeconds(), type => {
      const size = characters[type].spriteSize || normalSpriteSize;
      const outside = size/2 + 24;
      const spots = [
        [camera.x-outside, player.y], [camera.x+canvas.width+outside,player.y],
        [player.x,camera.y-outside], [player.x,camera.y+canvas.height+outside]
      ];
      return spots.some(([x,y])=>spawn(x,y,{type,variant:'normal',ai:true,behavior:'chase',automatic:true}));
    });
    if (eventTriggerSettings.enabled && time && timedSpawnsEnabled()) harmlessSchedule.update(getSurvivalSeconds(), type => {
      if (type === 'yuuka' && !canSpawnYuuka(records())) return;
      // Retry placement around the player so map walls cannot silently cancel a successful roll.
      for (let attempt = 0; attempt < 16; attempt++) {
        const angle = attempt * Math.PI / 8;
        const radius = Math.min(200, canvas.width / 4) * (1 - Math.floor(attempt / 8) * .5);
        if (spawn(player.x + Math.cos(angle)*radius, player.y + Math.sin(angle)*radius,
          {type, variant:'normal',ai:true,automatic:true})) break;
      }
    });
    // Tick once per simulation update, never once per enemy or contact check.
    player.contactIFrames = Math.max(0, (player.contactIFrames || 0) - time);
    const names = ['up', 'upRight', 'right', 'downRight', 'down', 'downLeft', 'left', 'upLeft'];
    for (const npc of records()) {
      if (npc.eventExpiresAt != null && getSurvivalSeconds()>=npc.eventExpiresAt) {
        endEventEnemies(npc.eventKey,player);continue;
      }
      npc.eventMotionAge=(npc.eventMotionAge||0)+time;
      updateKnockbackResistance(npc, time);
      if (npc.spawnArrivalPending) npc.spawnArrivalGrace = Math.max(0,(npc.spawnArrivalGrace ?? 10)-time);
      if (npc.type === 'midori' && !npc.campaignOverride) npc.movementSpeedMultiplier = midoriSpeed(player, baseMovementSpeed) / baseMovementSpeed;
      updateBossCatchup(npc, player, camera, canvas.width, canvas.height, baseMovementSpeed);
      advanceDamageFlash(npc, delta);
      if (npc.animationFrames) npc.gifElapsed = (npc.gifElapsed || 0) + delta * 1000 * (npc.animationSpeed || 1);
      if (time && updateEnemyControl(npc, time, moveKnockback)) {
        if (updateYuukaPresence(npc, camera, canvas.width, canvas.height, time)) { removeEnemy(npc.id); refresh(); }
        continue; // Stun suppresses movement AI, attacks and both contact checks.
      }
      if(time && bossBehaviors.updateNpc(npc,player,time,{x:camera.x,y:camera.y,width:canvas.width,height:canvas.height})) {
        if(npc.bossAction?.name!=='leap') {
          const attack=npc.attack;
          updateNpcContact(npc,player,playerMotion,time,moveKnockback,getSurvivalSeconds());
          if(npc.type==='iroha')npc.attack=attack; // Contact must not erase an active tank action pose.
        }
        continue;
      }
      if (time && updateNpcContact(npc, player, playerMotion, time, moveKnockback, getSurvivalSeconds())) continue;
      let direction;
      let chaseTarget;
      if (time && npc.ai) {
        if (npc.behavior === 'horde') {
          if(npc.chargeWait>0){npc.chargeWait=Math.max(0,npc.chargeWait-time);continue;}
          const motion=hordeMotion(npc);direction=motion.direction;chaseTarget=motion.target;
          if(npc.eventPattern==='wave') {
            // Oscillate the crossing direction; speed still uses the enemy's configured SPD.
            const angle=(npc.chargeAngle||0)+Math.sin(npc.eventMotionAge*4)*.65;
            chaseTarget={x:npc.x+Math.cos(angle)*10000,y:npc.y+Math.sin(angle)*10000};
          }
        } else if (npc.behavior === 'erratic') {
          const motion = yuukaMotion(npc, player, time);
          direction = motion.direction;
          chaseTarget = motion.target;
        } else if (npc.behavior === 'chase') {
          const target = npc.type === 'midori' ? midoriChaseTarget(npc, player)
            : { x: player.x + (npc.chaseOffsetX || 0), y: player.y + (npc.chaseOffsetY || 0) };
          const targetX = target.x, targetY = target.y;
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
        updateNpcContact(npc, player, playerMotion, 0, moveKnockback, getSurvivalSeconds());
        if (updateYuukaPresence(npc, camera, canvas.width, canvas.height, time)) {
          removeEnemy(npc.id); // Escaping grants no kills, EXP or credits.
          refresh();
        }
      }
    }
    const selected = getEnemy(selectedId);
    document.querySelector('#npc-inspector').textContent = selected
      ? `${selected.id} | X ${selected.x.toFixed(1)} Y ${selected.y.toFixed(1)} | HP ${selected.hp}/${selected.maxHp}${selected.hitsToDefeat ? ` | Hits ${selected.receivedHits || 0}/${selected.hitsToDefeat}` : ''} | AI ${selected.ai ? selected.behavior : 'off'}`
      : 'No NPC selected.';
  }

  /** Cull rendering only; sprite outlines use the shared Sprite Bounds toggle. */
  function draw(layer = 'normal') {
    const context = canvas.getContext('2d');
    if(layer==='boss')bossBehaviors.draw(context,camera);
    if (layer === 'normal') {
      for (let i=formationWarnings.length-1;i>=0;i--) {
        const warning=formationWarnings[i];
        if((warning.eventClock?campaignEvents.activeSeconds:getSurvivalSeconds())>=warning.expiresAt) {formationWarnings.splice(i,1);continue;}
        context.save();
        context.translate(Math.max(28,Math.min(canvas.width-28,warning.x-camera.x)),
          Math.max(28,Math.min(canvas.height-28,warning.y-camera.y)));
        context.rotate(warning.angle);
        context.fillStyle='#ff5264';context.strokeStyle='#fff';context.lineWidth=2;
        if(['airdrop','ambush'].includes(warning.pattern)) {
          context.beginPath();context.arc(0,0,22,0,Math.PI*2);context.strokeStyle='#ff5264';context.stroke();
        }
        if(['fastball','ambush'].includes(warning.pattern)) {
          context.beginPath();context.moveTo(0,0);context.lineTo(Math.hypot(canvas.width,canvas.height),0);
          context.strokeStyle='rgba(255,82,100,.55)';context.stroke();
        }
        context.beginPath();context.moveTo(18,0);context.lineTo(-14,-16);context.lineTo(-14,16);context.closePath();context.fill();context.stroke();
        context.restore();
      }
    }
    if (layer === 'normal') drawGachaDeaths(context, camera, canvas.width, canvas.height, true);
    const remnants = getEnemyDeaths().filter(npc =>
      npc.x >= camera.x - 300 && npc.x <= camera.x + canvas.width + 300 &&
      npc.y >= camera.y - 300 && npc.y <= camera.y + canvas.height + 300);
    for (const npc of [...visible(300), ...remnants].filter(enemy => enemyRenderLayer(enemy) === layer).sort((a, b) => a.y - b.y)) {
      if(['airdrop','ambush'].includes(npc.eventPattern)&&npc.eventMotionAge<.35) {
        // Visual descent only; the event still enters outside the viewport.
        drawCharacter({...npc,y:npc.y-100*(1-npc.eventMotionAge/.35)});
      } else drawCharacter(npc);
    }
    if (layer === 'normal') drawGachaDeaths(context, camera, canvas.width, canvas.height, false);
  }

  refresh();
  /** Clean up before spawning, or immediately after entering another map. */
  function cleanup() {
    let removed = trimEnemyPopulation(getPlayer());
    removed += despawnDistantEnemies(camera, canvas.width, canvas.height, isPlacementClear);
    if (removed) refresh();
    return removed;
  }

  return { update, draw: () => draw('normal'), drawSpecials: () => draw('special'), drawBosses: () => draw('boss'), refresh, cleanup, getEnemies: records,
    slotsRemaining: () => Math.max(0, cap - records().length),
    spawnCampaignEncounter: row => {
      const type=row.enemies[0],size=characters[type]?.spriteSize||normalSpriteSize;
      const margin=size/2+32,player=getPlayer();
      const spots=[[camera.x-margin,player.y],[camera.x+canvas.width+margin,player.y],
        [player.x,camera.y-margin],[player.x,camera.y+canvas.height+margin]];
      return spots.some(([x,y])=>spawn(x,y,{type,variant:'normal',ai:true,behavior:'chase',automatic:true,
        campaignEntry:{row,mega:false,scheduled:true}}));
    },
    spawnBoss: (type, x, y) => spawn(x, y, { type, variant: 'normal', ai: true, behavior: 'chase', automatic: true }),
    spawnEnemy: (x, y, forcedType, eventKey) => {
      if(campaignActive() && !forcedType) {
        const entry=getCampaignSpawn();
        return entry ? spawn(x,y,{type:entry.type,variant:'normal',ai:true,behavior:'chase',automatic:true,campaignEntry:entry}) : false;
      }
      if (forcedType === 'midori') return spawn(x, y, { type: 'midori', eventKey, ai: true, behavior: 'chase', automatic: true });
      // Harmless enemies now use scheduled rolls, never ordinary kill/arrival rolls.
      const type = chooseStandardEnemy(Math.random, getStageSeconds(), getStageId());
      return type ? spawn(x, y, { type, eventKey, variant: 'random', ai: true, behavior: 'chase', automatic: true }) : false;
    } };
}
