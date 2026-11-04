import { createPrincessKeySkill } from './princess-key-skill.js';
import { synergyRecipes } from './synergy-recipes.js';
import { createGachaFiles } from './gacha-files.js';
import { createPrincessKeyAttack } from './princess-key.optimized.js';
import { animationSpriteHurtbox } from './sprite-hurtbox.js';
import { createLuminousNovaSkill } from './luminous-nova-skill.js';
import { createLuminousNovaAttack, createLuminousNovaWeapon, getLuminousNova } from './luminous-nova.js';
import { createCrafterSystem } from './crafter-system.js';
import { bossMinimumSpriteSize } from './game-config.js';
import { bossActionFrames } from './boss-action-frames.js';
import { campaignSettings, pickEndlessEnemy } from './campaign-config.js';
import { createCampaignSchedule } from './campaign-schedule.js';
import { arisuFrames } from './arisu-animation.js';
import { neruFrames } from './neru-animation.js';
import { createStandardEnemy, createAdditionalEnemyRoster, enemyBounceOffset, pedrozillaLayout } from './enemy-roster.js';
import { createMegaMob, createMegaSweeper } from './mini-bosses.js';
import { createRunScore } from './run-score.js';
import { createSweeper } from './sweeper-sprites.js';
import { adminSkillResult } from './admin-skills.js';
import { createPlanaUmbrellaSkill } from './plana-umbrella-skill.js';
import { createSkillCasting } from './skill-casting.js';
import { nextStageAfterBoss, bossWaveIsDefeated } from './stage-progression.js';
import { createEndlessEvents } from './endless-events.js';
import { createSurvivalClock, createSurvivalDisplay } from './survival.js';
import { obstacleVisibility, eventTriggerSettings } from './game-config.js';
import { playerSettings, yuukaSettings, specialEnemyAnimationSettings } from './game-config.js';
import { ensurePlayerStats, createPlayerStatsTools, isPlayerDefeated } from './player-stats.js';
import { createExpPickups } from './exp-drops.js';
import { loadEnemyDeathGraphics } from './enemy-death.js';
import { midoriFrames } from './midori-animation.js';
import { senseiFrames } from './sensei-animation.js';
import { yuukaFrames } from './yuuka-animation.js';
import { createUmbrellaAttack, umbrellaSettings } from './umbrella-attack.js';
import { getCombatHitbox } from './combat-hitboxes.js';
import { statMultiplier } from './combat-stats.js';
import { offscreenSpawnSides, createPlaytestSpawner } from './playtest-spawner.js';
import { createBossSpawner, bossWaveLimit } from './boss-spawner.js';
import { endEventEnemies, isBossEnemy, enemyRenderLayer, getAllEnemies, damageEnemy, onEnemyDefeat } from './world-state.js';
import { setupFullscreenPreview } from './fullscreen-preview.js';
import { createArisAttack, createArisWeapon, getArisWeapon } from './aris-weapon.js';
import { umbrellaLevelStats } from './weapon-progression.js';
import { createLevelUpMenu } from './level-up-menu.js';
import { createPauseMenu } from './pause-menu.js';
import { runSeed, runStartedAt } from './run-seed.js';
import { mapSizeMultiplier, stripMapBounds, clampStripCamera, canSpawnInStrip } from './map-bounds.js';
import { loadDamageNumberGraphics, updateDamageNumbers, drawDamageNumbers } from './damage-numbers.js';
import { createHud } from './hud.js';
import { shirokoFrames } from './shiroko-animation.js';
import { loadGifAnimation, gifFrameAt } from './gif-animation.js';
import { normalSpriteSize, bossSpriteSize, spriteDisplayPadding } from './scene-metrics.js';
import { observeViewport } from './viewport.js';
import { createMapAudio } from './map-audio.js';
import { canPlaceIslandLoot, islandScale, islandWidth, islandHeight, canStandOnIsland, resolveIslandMotion, drawIsland, drawTowerOcclusion } from './island-world.js';
import { tileFiles, drawTileWorld, resolveObstacleMotion, obstaclesIn } from './tile-world.js';
import { officeTileFiles, drawOfficeWorld, officeObstaclesIn, resolveOfficeMotion, drawOfficeMonumentOcclusion } from './office-world.js';
import { palaceTileFiles, drawPalaceWorld, palaceObstaclesIn, resolvePalaceMotion, drawPalaceOcclusion } from './palace-world.js';
import { getDamageFlashOpacity, getWhiteSprite, advanceDamageFlash } from './damage-feedback.js';
import { requireAdmin } from './admin-guard.js';
import { spriteLayouts } from './sprite-layouts.js';
import { setupSpriteTester } from './sprite-tester.js';
import { createAiming } from './aiming.js';
import { createNpcTools } from './npc-tools.js';
import { createMapTransition } from './map-transition.js';

const authorized = await requireAdmin();
const survivalClock = createSurvivalClock();
const runScore = createRunScore();
const campaignSchedule = createCampaignSchedule();
// Session-only inspection; leaderboard placement and persistence remain deferred.
window.addEventListener('run-score-calculated', ({detail}) => {
  const output = document.querySelector('#score-test-status');
  if (output) output.textContent = `${detail.character} | ${detail.mode} ${detail.stage} | Score ${detail.finalScore} | Kills ${detail.enemyDefeated}, mini-bosses ${detail.miniBossDefeated}, bosses ${detail.bossDefeated}`;
});
const survivalDisplay = authorized ? createSurvivalDisplay() : null;
const arisAttack = authorized ? createArisAttack() : null;
const princessSkill = authorized ? createPrincessKeySkill() : null;
const princessAttack = authorized ? createPrincessKeyAttack() : null;
const luminousAttack = authorized ? createLuminousNovaAttack() : null;
const luminousSkill = authorized ? createLuminousNovaSkill() : null;
const umbrellaAttack = authorized ? createUmbrellaAttack() : null;
const planaSkill = authorized ? createPlanaUmbrellaSkill() : null;
const expPickups = authorized ? createExpPickups(() => characters[selected], { isLandingClear: isLootLandingClear }) : null;
const canvas = document.querySelector('#arena');
// Right-click is reserved for drawing skills; never open the browser context menu.
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => {
  if (event.button === 2) event.preventDefault();
});
const context = canvas.getContext('2d');
const status = document.querySelector('#status');
const aiming = authorized ? createAiming(canvas) : null;
const heldDirections = new Map();
// EDIT THESE VALUES to tune animation speed and the rendered sprite area.
const frameDuration = 110; // Milliseconds per walking frame; lower is faster.
const spriteSize = normalSpriteSize; // Fixed display size, independent of viewport.
const movementSpeed = playerSettings.movementBase; // Canvas pixels per second, including diagonals.
const spritePadding = spriteDisplayPadding; // Fixed display padding shared with collision.
let showSpriteBounds = false; // Set true to see the rendered frame rectangle.

// Source crop boundaries are editable in sprite-layouts.js. Do not enlarge the
// canvas to fix source clipping: adjust that frame's row/column edges instead.
const directionVectors = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
  upLeft: [-1, -1], upRight: [1, -1],
  downLeft: [-1, 1], downRight: [1, 1]
};
// Playable characters are Plana and Arona. Mob and Iroha remain admin-only test avatars.
let selected = 'plana';
let previousTime;
let npcTools;
let playtestSpawner;
let bossSpawner;
const endlessBuildup = createEndlessEvents(() => {
  bossSpawner?.requestWave();
}, Math.random, () => {}, eventKey => {
  endEventEnemies(eventKey, characters[selected]);
  npcTools?.refresh();
});
let endlessMode = false;
let pendingStageTransition = null;
let endlessStartedAt = null; // Active survival time when Stage 4 first completes.
let pauseMenu;
let levelUpMenu;
let crafters;
let goldenCrafters;
let gachaFiles;
let awaitingFileStageAdvance=false;
/** Share one gameplay pause condition across movement, clocks, transitions and casting. */
function isGameplayPaused() { return Boolean(pauseMenu?.paused || levelUpMenu?.active || crafters?.active || goldenCrafters?.active || gachaFiles?.active); }
let mapAudio;
let hud;
let playerStatsTools;
let skillCasting;

// EDIT rows to change which source row is used for each direction (0 = top).
// Use mirroredDirections when a sheet contains duplicate left-facing poses
// instead of a usable right-facing row. This also avoids malformed source rows.
const characters = {
  plana: {
    label: 'Plana',
    maxHp: playerSettings.planaHp, // EDIT starting player HP; session initialization fills to this value.
    pickupRange: playerSettings.planaPickup, // EDIT auto-pickup radius from the sprite center (+10% from 90px).
    attackSlots: [{ id: 'plana-umbrella', name: "Plana's Umbrella", icon: '../sprites/attacks/plana umbrella.png',
      iconCrop: { x: 100, y: 228, width: 68, height: 304 }, iconRotation: 45, level: 1 }],
    movementSpeedMultiplier: playerSettings.speed / movementSpeed, // Player travel speed is 240 px/s; NPCs use their own multiplier.
    source: '../sprites/Plana Sprite Sheet.png',
    // Original sheet, top to bottom (row indices are zero-based):
    // 0 down, 1 down-left, 2 left, 3 up-left,
    // 4 up, 5 up-right, 6 right, 7 down-right.
    // Each direction uses its OWN row, unmirrored, and all five frame columns.
    rows: {
      down: 0,
      downLeft: 1,
      left: 2,
      upLeft: 3,
      up: 4,
      upRight: 5,
      right: 6,
      downRight: 7
    },
    mirroredDirections: [],
    frameSequence: [0, 1, 2, 3, 4],
    layout: spriteLayouts.plana,
    x: 310, y: 260, direction: 'down', elapsed: 0, moving: false
  },
  arona: {
    label: 'Arona',
    maxHp: playerSettings.aronaHp,
    pickupRange: playerSettings.aronaPickup, // No starting attraction; direct walk-over collection still works.
    movementSpeedMultiplier: playerSettings.speed / movementSpeed, // Player travel speed is 240 px/s; NPCs use their own multiplier.
    preserveWalkPhase: true, // Keep stride timing continuous when turning.
    source: '../sprites/Arona Sprite Sheet.png',
    // Corrected original sheet: use all eight source rows directly, top to
    // bottom: down, down-left, left, up-left, up, up-right, right, down-right.
    rows: { down: 0, downLeft: 1, left: 2, upLeft: 3, up: 4, upRight: 5, right: 6, downRight: 7 },
    mirroredDirections: [],
    frameSequence: [0, 1, 2, 3, 4],
    layout: spriteLayouts.arona,
    referenceSize: 190,
    x: 310, y: 260, direction: 'down', elapsed: 0, moving: false
  },
  shiroko: {
    label: 'Shiroko Boss',
    boss: true,
    contactRecoveryDelay: false, // Boss AI keeps pursuing while contact recoil plays.
    source: '../sprites/enemies/bosses/Shiroko Boss.gif',
    gifFrames: shirokoFrames,
    gifElapsed: 0,
    spriteSize: bossSpriteSize,
    referenceSize: 374, // Fit the entire portrait GIF in the fixed boss sprite area.
    horizontalFacingOnly: true,
    defaultDirection: 'left',
    facing: 'left',
    movementSpeedMultiplier: 2 / 3, // Boss/NPC travel speed: 120 px/s.
    x: 310, y: 260, direction: 'left', elapsed: 0, moving: false
  },
  iroha: {
    label: 'Iroha Boss',
    boss: true,
    contactRecoveryDelay: false, // Boss AI keeps pursuing while contact recoil plays.
    chaseOffsetY: -30, // EDIT barrel alignment; negative values move the chase target higher.
    movementSpeedMultiplier: 2 / 3, // NPC travel speed: 120 pixels per second.
    source: '../sprites/enemies/bosses/Iroha Tank Sprite Animation Sheet.png?v=d3496c7b721c',
    // Updated 1448 x 1086 sheet: 181-pixel cells; rows 0/1 are movement;
    // rows 2/3 are cannon attacks; rows 4/5 are flag-wave artillery attacks.
    rows: { left: 0, right: 1, down: 0, downLeft: 0, upLeft: 0, up: 0, upRight: 1, downRight: 1 },
    horizontalFacingOnly: true, // Move in eight directions; render only left/right poses.
    facing: 'left', // Vertical movement keeps the last horizontal facing.
    defaultDirection: 'left',
    spriteSize: bossSpriteSize, // Fixed boss display size, three times the normal actor size.
    frameSequence: [0, 1, 2, 3, 4, 5, 6, 7],
    frameDuration: 110,
    preserveWalkPhase: true,
    layout: spriteLayouts.iroha,
    referenceSize: 165, // Keep the tank visually larger than normal characters.
    transitionDuration: 100, // EDIT blend duration in ms between attacks/movement/facings.
    attacks: {
      cannon: { label: 'Main cannon', rows: { left: 2, right: 3 }, frameDuration: 110 },
      artillery: { label: 'Flag-wave artillery', rows: { left: 4, right: 5 }, frameDuration: 140 }
    },
    x: 310, y: 260, direction: 'down', elapsed: 0, moving: false
  },
  midori: {
    label: 'Midori', special: true, animationSpeed: specialEnemyAnimationSettings.midori,
    source: '../sprites/enemies/special/Midori Normal.gif', gifFrames: midoriFrames,
    spriteSize: bossSpriteSize * yuukaSettings.sizeRatio, referenceSize: 160, contactDamage: 1, // Match Yuuka's display height.
    horizontalFacingOnly: true, defaultDirection: 'right', facing: 'right', nativeFacing: 'right',
    x: 310, y: 260, direction: 'right', elapsed: 0, moving: false
  },
  yuuka: {
    label: 'Yuuka (Credit Drop)', special: true, animationSpeed: specialEnemyAnimationSettings.yuuka,
    source: '../sprites/enemies/special/100kg thighs.gif', gifFrames: yuukaFrames,
    referenceSize: 160, spriteSize: bossSpriteSize * yuukaSettings.sizeRatio, // Yuuka is 90% of boss display height.
    contactDamage: yuukaSettings.contactDamage,
    horizontalFacingOnly: true, defaultDirection: 'right', facing: 'right', nativeFacing: 'right',
    contactRecoveryDelay: false,
    x: 310, y: 260, direction: 'right', elapsed: 0, moving: false
  },
  sensei: {
    label: 'Sensei (Credit Drop)', special: true, animationSpeed: 1,
    source: '../sprites/enemies/special/sensei.gif', gifFrames: senseiFrames,
    referenceSize: 160, spriteSize: bossSpriteSize * yuukaSettings.sizeRatio,
    contactDamage: 0, horizontalFacingOnly: true, defaultDirection: 'right',
    facing: 'right', nativeFacing: 'right', contactRecoveryDelay: false,
    x: 310, y: 260, direction: 'right', elapsed: 0, moving: false
  },
  whiteSweeper: createSweeper('White Sweeper', '../sprites/enemies/normal/WhiteSweeper.png'),
  heavySweeper: createSweeper('Heavy Sweeper', '../sprites/enemies/normal/HeavySweeper.png'),
  mob: {
    label: 'Mob',
    movementSpeedMultiplier: 2 / 3, // NPC travel speed: 120 pixels per second.
    source: '../sprites/enemies/normal/Mob Sprite Sheet.png',
    // Mob rows 6/7 still face left and overlap nearby artwork. Reuse the
    // clean left/down-left rows and mirror them for correct rightward poses.
    rows: { down: 0, downLeft: 1, left: 2, upRight: 3, up: 4, upLeft: 5, right: 2, downRight: 1 },
    mirroredDirections: ['right', 'downRight'],
    layout: spriteLayouts.mob,
    x: 590, y: 260, direction: 'down', elapsed: 0, moving: false
  }
};


Object.assign(characters,createAdditionalEnemyRoster());
characters.megaMob = createMegaMob(characters.mob);
characters.megaSweeper = createMegaSweeper(characters.whiteSweeper);
// Normal Pedrozilla matches Sweeper; every Mega spawning path matches Elite Mob size.
characters.pedrozilla = {...createStandardEnemy('Pedrozilla','Pedrozilla.png'),
  spriteSize:characters.whiteSweeper.spriteSize,
  megaSizeMultiplier:characters.megaMob.spriteSize/characters.whiteSweeper.spriteSize,
  // Tune height (pixels) and periodSeconds to adjust Pedrozilla's skipping motion.
  movementBounce:{height:4,periodSeconds:.38}};
characters.pedrozilla.layout=pedrozillaLayout(characters.pedrozilla.layout);
for(const [id,base,label] of [
  ['megaMob3','mob3','Mega Mob 3'],['megaHeavySweeper','heavySweeper','Mega Heavy Sweeper'],
  ['megaOpsSweeper','opsSweeper','Mega OPS Sweeper'],['megaArius2','arius2','Mega Arius 2'],
  ['megaArius3','arius3','Mega Arius 3'],['megaPedrozilla','pedrozilla','Mega Pedrozilla']
]) characters[id]={...createMegaMob(characters[base]),label};
for(const [id,label,source,frames] of [
  ['arisu','Arisu Boss','../sprites/enemies/bosses/arisu boss/arisu normal.gif',arisuFrames],
  ['neru','Neru Boss','../sprites/enemies/bosses/neru/A1-transparent-clean-outline.gif',neruFrames]
]) characters[id]={label,boss:true,source,gifFrames:frames,spriteSize:bossSpriteSize,referenceSize:200,
  contactRecoveryDelay:false,horizontalFacingOnly:true,defaultDirection:'left',facing:'left',
  x:310,y:260,direction:'left',elapsed:0,moving:false};


// Strip maps are 1.5 times the viewport on their finite axis.
// The level is infinite horizontally. Only intersecting tiles are drawn each frame;
// no tile objects or off-screen canvases are retained. Camera stops at finite edges.
// EDIT topMovementPadding to restrict the top edge if needed (canvas pixels).
// Zero allows walking into the window area; the sprite stays inside the screen.
const topMovementPadding = 0;
// EDIT bottomMovementPadding to reserve space below the sprite (canvas pixels).
// Names are no longer drawn, so no extra label space is needed at the bottom.
const bottomMovementPadding = 0;
const camera = { x: 0, y: 0 };
const maps = {
  first: { originX: 0, originY: 0, label: 'Playarea', axis: 'horizontal',
    source: '../sprites/playarea 1/Playarea.png', image: null,
    tiles: officeTileFiles.map(file => ({ source: `../sprites/playarea 1/${file}` })) },
  second: { originX: 0, originY: 0, label: 'Playarea 2', axis: 'vertical',
    tiles: palaceTileFiles.map(file => ({ source: `../sprites/playarea 2/${file}` })),
    leftWallRatio: 0.12, rightWallRatio: 0.88 },
  third: { label: 'Playarea 3', axis: 'both',
    tiles: tileFiles.map(file => ({ source: `../sprites/playarea 3/${file}` })) },
  fourth: { label: 'Playarea 4', axis: 'island', source: '../sprites/play area 4.png', image: null,
    originX: 0, originY: 0, placed: false } // EDIT inner wall edges as image-width ratios.
};
let currentMap = 'first';
let stageEnteredAt = 0;
const cameraAnchor = { x: canvas.width / 2, y: canvas.height / 2 };
const cameraRecenterSpeed = 2.5; // EDIT catch-up rate: lower gives gentler, slower centering.
const mapTransition = authorized ? createMapTransition(canvas) : null;

/** Switch only the background/scrolling axis; entities keep their world positions. */
function switchMap(targetMap = null) {
  if (!mapTransition || mapTransition.active || !maps.first.image) return;
  planaSkill?.reset();
  arisAttack?.reset();
  luminousAttack?.reset();
  princessAttack?.reset();
  princessSkill?.reset();
  // Snapshot BACKGROUND ONLY. Characters, NPCs, and aim graphics are drawn later.
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayarea();
  const outgoingMap = currentMap;
  mapTransition.begin(layer => drawPlayarea(layer, outgoingMap));
  const player = characters[selected];
  // Retain the current camera origin and player screen position on the new axis.
  cameraAnchor.x = player.x - camera.x;
  cameraAnchor.y = player.y - camera.y;
  const mapOrder = ['first', 'second', 'third', 'fourth'].filter(id => !maps[id].disabled);
  const requested = typeof targetMap === 'string' && maps[targetMap] && !maps[targetMap].disabled
    ? targetMap : mapOrder[(mapOrder.indexOf(currentMap) + 1) % mapOrder.length];
  if (currentMap !== requested) stageEnteredAt = survivalClock.seconds;
  currentMap = requested;
  if (campaignSettings.enabled && !endlessMode) campaignSchedule.setStage(currentMap);
  if (currentMap === 'fourth' && !maps.fourth.placed) {
    // Anchor the island's open central plaza under the player on first entry.
    // This positions the MAP, preserving existing player/NPC world coordinates.
    maps.fourth.originX = player.x - 740 * islandScale;
    maps.fourth.originY = player.y + (player.spriteSize || spriteSize) / 2 - spritePadding - 620 * islandScale;
    maps.fourth.placed = true;
  }
  // Align the new map on its locked axis at the retained camera origin.
  if (maps[currentMap].axis === 'vertical') maps[currentMap].originX = camera.x;
  else if (maps[currentMap].axis === 'horizontal') maps[currentMap].originY = camera.y;
  updateCamera();
  npcTools?.cleanup();
  expPickups?.clear();
  crafters?.clear();
  goldenCrafters?.clear();
  awaitingFileStageAdvance=false;
  gachaFiles?.clear();
  mapAudio?.setMap(currentMap);
  // Keep held inputs, attack timers, AI and aiming live throughout the transition.
  document.querySelector('#switch-map').textContent = `Switch map (current: ${maps[currentMap].label})`;
  return true;
}

document.querySelector('#switch-map').addEventListener('click', switchMap);

/** Reset character positions and horizontal camera without changing sprite settings. */
function resetScene() {
  planaSkill?.reset();
  arisAttack?.reset();
  luminousAttack?.reset();
  princessAttack?.reset();
  princessSkill?.reset();
  umbrellaAttack?.reset();
  aiming?.reset();
  releaseControls();
  for (const character of Object.values(characters)) {
    character.x = canvas.width * 0.4;
    character.y = canvas.height * 0.6;
    if (currentMap === 'first') character.y += maps.first.originY;
    if (currentMap === 'second') character.x += maps.second.originX;
    if (currentMap === 'fourth') {
      character.x = maps.fourth.originX + 740 * islandScale;
      character.y = maps.fourth.originY + 620 * islandScale - (character.spriteSize || spriteSize) / 2 + spritePadding;
    }
    character.direction = character.defaultDirection || 'down';
    if (character.horizontalFacingOnly) character.facing = character.direction;
    character.elapsed = 0;
    character.moving = false;
    character.attack = null;
    character.transition = null;
  }
  camera.x = 0;
  camera.y = 0;
  cameraAnchor.x = canvas.width / 2;
  cameraAnchor.y = canvas.height / 2;
  updateCamera();
  updateAttackControls();
}

/** Follow the active character through positive and negative world coordinates. */
function updateCamera(delta = 0) {
  // Ease the retained screen anchor toward center after changing map axes.
  // World coordinates never change; the entire scene follows the same camera.
  const blend = 1 - Math.exp(-cameraRecenterSpeed * delta);
  cameraAnchor.x += (canvas.width / 2 - cameraAnchor.x) * blend;
  cameraAnchor.y += (canvas.height / 2 - cameraAnchor.y) * blend;
  camera.x = characters[selected].x - cameraAnchor.x;
  camera.y = characters[selected].y - cameraAnchor.y;
  clampStripCamera(maps[currentMap], camera, canvas.width, canvas.height);
  if (currentMap === 'fourth') {
    const map = maps.fourth;
    camera.x = Math.max(map.originX, Math.min(map.originX + islandWidth - canvas.width, camera.x));
    camera.y = Math.max(map.originY, Math.min(map.originY + islandHeight - canvas.height, camera.y));
  }
}

/** Compute only visible tile indices, including negative indices left of origin. */
function getVisibleTileRange(cameraX, viewportWidth, tileWidth) {
  return {
    first: Math.floor(cameraX / tileWidth),
    last: Math.ceil((cameraX + viewportWidth) / tileWidth) - 1
  };
}

/** Render a bounded number of tiles from one shared image, however far we travel. */
function drawPlayarea(target = context, mapId = currentMap) {
  const map = maps[mapId];
  if (mapId === 'first') {
    drawOfficeWorld(target, map, camera, canvas.width, canvas.height);
    return;
  }
  if (mapId === 'second') {
    drawPalaceWorld(target, map, camera, canvas.width, canvas.height);
    return;
  }
  if (map.axis === 'island') {
    target.fillStyle = '#087fb9';
    target.fillRect(0, 0, canvas.width, canvas.height);
    drawIsland(target, map, camera);
    return;
  }
  if (map.axis === 'both') {
    drawTileWorld(target, map.tiles, camera, canvas.width, canvas.height);
    return;
  }
  const scale = map.axis === 'horizontal'
    ? canvas.height * mapSizeMultiplier / map.image.naturalHeight
    : canvas.width * mapSizeMultiplier / map.image.naturalWidth;
  const tileWidth = map.image.naturalWidth * scale;
  const tileHeight = map.image.naturalHeight * scale;
  const offsetX = camera.x - map.originX;
  const offsetY = camera.y - map.originY;
  const columns = getVisibleTileRange(offsetX, canvas.width, tileWidth);
  const rows = getVisibleTileRange(offsetY, canvas.height, tileHeight);
  // Only the long axis repeats. Outgoing transition layers may repeat for coverage.
  if (mapId === currentMap && map.axis === 'horizontal') rows.first = rows.last = 0;
  if (mapId === currentMap && map.axis === 'vertical') columns.first = columns.last = 0;
  // Normally only the map's scrolling axis changes. During a transition the
  // outgoing map also follows the new camera axis; visible repeats avoid gaps.
  for (let row = rows.first; row <= rows.last; row++) {
    for (let column = columns.first; column <= columns.last; column++) {
      const left = Math.round(column * tileWidth - offsetX);
      const top = Math.round(row * tileHeight - offsetY);
      const right = Math.round((column + 1) * tileWidth - offsetX);
      const bottom = Math.round((row + 1) * tileHeight - offsetY);
      target.drawImage(map.image, left, top, right - left, bottom - top);
    }
  }
}

// These controls live OUTSIDE the simulated screen, never over gameplay.
document.querySelector('#reset-scene').addEventListener('click', resetScene);
// A full new run clears session state and generates a new local-time-based seed.
document.querySelector('#new-game').addEventListener('click', () => {
  const url = new URL(window.location.href);
  url.searchParams.set('seed', 'random');
  if (url.href === window.location.href) window.location.reload();
  else window.location.assign(url.href);
});
document.querySelector('#admin-seed-zero').addEventListener('click', () => {
  const url = new URL(window.location.href);
  url.searchParams.set('seed', '0');
  if (url.href === window.location.href) window.location.reload();
  else window.location.assign(url.href);
});
document.querySelector('#toggle-bounds').addEventListener('click', event => {
  showSpriteBounds = !showSpriteBounds;
  event.currentTarget.setAttribute('aria-pressed', String(showSpriteBounds));
});
// Keep frequently used progression controls separate from the general admin panel.
// The toolbar shortcut and native dropdown summary control the same open state.
const playerStatsPanel = document.querySelector('#player-stats-panel');
const playerStatsToggle = document.querySelector('#toggle-player-stats');
playerStatsToggle.addEventListener('click', () => {
  playerStatsPanel.open = !playerStatsPanel.open;
  playerStatsToggle.setAttribute('aria-expanded', String(playerStatsPanel.open));
});
playerStatsPanel.addEventListener('toggle', () => {
  playerStatsToggle.setAttribute('aria-expanded', String(playerStatsPanel.open));
});

document.querySelector('#admin-tools').addEventListener('click', event => {
  const panel = document.querySelector('#admin-panel');
  panel.hidden = !panel.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
});

// Apply the Shiroko-sized floor to every boss template; retain any larger custom sprites.
for(const character of Object.values(characters)) {
  if(character.boss) character.spriteSize=Math.max(character.spriteSize||bossSpriteSize,bossMinimumSpriteSize);
}

/** Load a sheet before animation begins and report an actionable loading error. */
async function loadSheet(character) {
  if (character.gifFrames) {
    await loadGifAnimation(character);
    const actions=character.label==='Arisu Boss'?{charge:bossActionFrames.arisuCharge}:
      character.label==='Neru Boss'?{shoot:bossActionFrames.neruShoot}:{};
    character.actionAnimations={};
    await Promise.all(Object.entries(actions).map(async ([name,gifFrames])=>{
      const clip={gifFrames};await loadGifAnimation(clip);character.actionAnimations[name]=clip.animationFrames;
    }));
    return;
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      character.image = image;
      resolve();
    };
    image.onerror = () => reject(new Error(`Could not load ${character.source}.`));
    image.src = character.source;
  });
}

/** Resolve keyboard input to one of the four supported movement directions. */
function directionForKey(key) {
  return {
    ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right'
  }[key.length === 1 ? key.toLowerCase() : key];
}

/** Clear held input when focus is lost so characters cannot get stuck moving. */
function releaseControls() {
  heldDirections.clear();
}

window.addEventListener('keydown', event => {
  if (isGameplayPaused()) return;
  // Let admin form fields use their own arrow keys and text input.
  if (event.target?.closest('input, select, textarea')) return;
  const direction = directionForKey(event.key);
  if (!direction) return;
  event.preventDefault();
  if (!event.repeat) heldDirections.set(event.code, direction);
});

window.addEventListener('keyup', event => {
  heldDirections.delete(event.code);
});

window.addEventListener('blur', releaseControls);
document.addEventListener('visibilitychange', releaseControls);

/** Swap the development avatar in place, keeping one visible camera target. */
function switchCharacter(name) {
  if (!characters[name] || name === selected) return;
  const previous = characters[selected];
  const next = characters[name];

  // Carry the player position across so swapping does not jump the camera.
  next.x = previous.x;
  next.y = previous.y;
  next.direction = previous.direction;
  if (next.horizontalFacingOnly) {
    const horizontal = directionVectors[previous.direction][0];
    if (horizontal) next.facing = horizontal > 0 ? 'right' : 'left';
  }
  next.elapsed = 0;
  next.moving = false;
  previous.elapsed = 0;
  previous.moving = false;
  previous.attack = null;
  previous.transition = null;
  next.attack = null;
  next.transition = null;
  selected = name;
  releaseControls();
  updateCamera();
  updateAttackControls();

  document.querySelectorAll('[data-character]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.character === selected));
  });
}

/** Reveal boss-only attack buttons and prevent overlapping attack cycles. */
function updateAttackControls() {
  const character = characters[selected];
  document.querySelector('#boss-attacks').hidden = !character.attacks;
  document.querySelectorAll('[data-attack]').forEach(button => {
    button.disabled = Boolean(character.attack) || !character.attacks?.[button.dataset.attack];
  });
}

/** Play one complete facing-specific attack animation, holding the boss in place. */
function startBossAttack(name) {
  const character = characters[selected];
  if (!character.attacks?.[name] || character.attack) return;
  beginPoseTransition(character);
  character.attack = { name, facing: character.facing, elapsed: 0, walkElapsed: character.elapsed };
  character.moving = false;
  updateAttackControls();
}

document.querySelectorAll('[data-attack]').forEach(button => {
  button.addEventListener('click', () => startBossAttack(button.dataset.attack));
});

document.querySelectorAll('[data-character]').forEach(button => {
  // Development-only selection; the future game character picker is not built yet.
  button.addEventListener('click', () => switchCharacter(button.dataset.character));
});

document.querySelectorAll('[data-direction]').forEach(button => {
  // Pointer capture lets touch and mouse controls release outside the button.
  button.addEventListener('pointerdown', event => {
    button.setPointerCapture(event.pointerId);
    heldDirections.set(`pointer-${event.pointerId}`, button.dataset.direction);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, event => {
      heldDirections.delete(`pointer-${event.pointerId}`);
    });
  }
});

/** Combine held inputs into eight directions; opposite inputs cancel each other. */
function getMovementDirection() {
  let x = 0;
  let y = 0;
  // A held W and ArrowUp count as one direction rather than double speed.
  for (const direction of new Set(heldDirections.values())) {
    const vector = directionVectors[direction];
    x += vector[0];
    y += vector[1];
  }
  x = Math.sign(x);
  y = Math.sign(y);
  return Object.keys(directionVectors).find(direction => {
    const vector = directionVectors[direction];
    return vector[0] === x && vector[1] === y;
  });
}

/** Stop at walls without relocating a player already outside after switching maps. */
function constrainWithoutTeleport(previous, next, minimum, maximum) {
  if (previous < minimum) return Math.min(minimum, Math.max(previous, next));
  if (previous > maximum) return Math.max(maximum, Math.min(previous, next));
  return Math.max(minimum, Math.min(maximum, next));
}

/** Move within canvas bounds, keeping diagonal and cardinal movement equally fast. */
function updateCharacter(character, delta, direction, chaseTarget) {
  if (character.attack) {
    character.attack.elapsed += delta * 1000;
    const attack = character.attacks[character.attack.name];
    const frames = character.layout.columnEdges.length - 1;
    if (character.attack.elapsed >= frames * attack.frameDuration) {
      const walkElapsed = character.attack.walkElapsed;
      beginPoseTransition(character);
      character.attack = null;
      character.elapsed = walkElapsed;
      updateAttackControls();
    } else {
      return;
    }
  }
  character.moving = Boolean(direction);
  if (!direction) {
    character.elapsed = 0;
    return;
  }

  // Arona turns at the current stride phase rather than snapping to frame zero.
  if (character.direction !== direction && !character.preserveWalkPhase) {
    character.elapsed = 0;
  }
  character.direction = direction;
  if (character.horizontalFacingOnly) {
    const horizontal = directionVectors[direction][0];
    if (horizontal) {
      const facing = horizontal > 0 ? 'right' : 'left';
      if (facing !== character.facing) beginPoseTransition(character);
      character.facing = facing;
    }
  }
  character.elapsed += delta * 1000;
  // Chase uses the precise center-to-center vector; facing stays eight-way.
  const [x, y] = chaseTarget
    ? [chaseTarget.x - character.x, chaseTarget.y - character.y]
    : directionVectors[direction];
  const length = Math.hypot(x, y);
  const baseSpeed = movementSpeed * (character.movementSpeedMultiplier || 1) * statMultiplier(character, 'spdPercent');
  const step = Math.max(baseSpeed, character.catchupSpeed || 0) * delta;
  const distance = (chaseTarget ? Math.min(step, length) : step) / (length || 1);
  const previousX = character.x;
  const previousY = character.y;
  character.x += x * distance;
  character.y += y * distance;
  if (chaseTarget && step >= length) {
    character.x = chaseTarget.x;
    character.y = chaseTarget.y;
  }
  const isEnemy = character !== characters[selected];
  if (character.harmlessEscaping || character.behavior === 'horde') return; // Escape animations may cross the shoreline/walls to leave view.
  if (currentMap === 'fourth') {
    const resolved = resolveIslandMotion(character, previousX, previousY, character.x, character.y, maps.fourth, isEnemy);
    character.x = resolved.x;
    character.y = resolved.y;
    return;
  }
  if (maps[currentMap].axis === 'both') {
    if (isEnemy) return; // Enemies cross props; the player still collides normally.
    const resolved = resolveObstacleMotion(character, previousX, previousY, character.x, character.y);
    character.x = resolved.x;
    character.y = resolved.y;
    return;
  }
  if (currentMap === 'first' && !isEnemy) {
    const resolved = resolveOfficeMotion(character, previousX, previousY, character.x, character.y, maps.first, canvas.height);
    character.x = resolved.x;
    character.y = resolved.y;
  }
  if (currentMap === 'second' && !isEnemy) {
    const resolved = resolvePalaceMotion(character, previousX, previousY, character.x, character.y, maps.second, canvas.width);
    character.x = resolved.x;
    character.y = resolved.y;
  }
  // Neither map's locked-axis limits should interrupt diagonal input while the
  // backgrounds are changing. Apply destination walls only after the ripple.
  // Existing outside positions are preserved by constrainWithoutTeleport below.
  if (mapTransition?.active) return;
  const margin = (character.spriteSize || spriteSize) / 2;
  const bounds = stripMapBounds(maps[currentMap], canvas.width, canvas.height, topMovementPadding, bottomMovementPadding);
  // X is an unbounded world position, not a canvas position. Never wrap it:
  // future enemy positions must remain stable when background tiles disappear.
  if (maps[currentMap].axis === 'horizontal') {
    character.y = constrainWithoutTeleport(previousY, character.y, bounds.top + margin, bounds.bottom - margin);
  } else {
    character.x = constrainWithoutTeleport(previousX, character.x, bounds.left + margin, bounds.right - margin);
  }
}

/** Return a source rectangle using the sheet's uneven per-column row boundaries. */
function getFrameRectangle(character, frame) {
  const facing = character.horizontalFacingOnly ? character.facing : character.direction;
  const row = character.attack
    ? character.attacks[character.attack.name].rows[character.attack.facing]
    : !character.moving && character.idleRows?.[facing] !== undefined
    ? character.idleRows[facing]
    : character.rows[facing];
  // Attack artwork can exceed the grid cell. Custom rectangles keep the tank's
  // anchor fixed even when a muzzle flash needs a wider crop.
  const custom = character.layout.frames?.[row]?.[frame];
  if (custom) return custom;
  const { columnEdges, rowEdges } = character.layout;
  return {
    x: columnEdges[frame],
    y: rowEdges[frame][row],
    width: columnEdges[frame + 1] - columnEdges[frame],
    height: rowEdges[frame][row + 1] - rowEdges[frame][row],
    anchorX: character.layout.anchorX?.[row]?.[frame],
    footY: character.layout.footY?.[frame]?.[row] ?? rowEdges[frame][row + 1]
  };
}

/** Select a direction-specific walking cycle, or hold frame zero when idle. */
function getAnimationFrame(character) {
  if (character.attack) {
    const attack = character.attacks[character.attack.name];
    return Math.min(character.layout.columnEdges.length - 2,
      Math.floor(character.attack.elapsed / attack.frameDuration));
  }
  if (!character.moving) return 0;
  const frames = character.walkFrames?.[character.direction] ||
    character.frameSequence || [1, 2, 3, 4];
  const duration = character.frameDuration || frameDuration;
  return frames[Math.floor(character.elapsed / duration) % frames.length];
}

/** Blend from the last visible pose without moving the character's world anchor. */
function beginPoseTransition(character) {
  if (character.transitionDuration && character.lastPose) {
    character.transition = { from: character.lastPose, elapsed: 0 };
  }
}

/** Render one pose with shared scale and measured foot anchors, including effects. */
function drawPose(character, pose, opacity) {
  opacity *= character.death?.opacity ?? 1;
  const crop = pose.crop;
  const displaySize = character.spriteSize || spriteSize;
  const scale = (displaySize - spritePadding * 2) / (character.referenceSize || 215);
  const width = crop.width * scale;
  const height = crop.height * scale;
  const drawY = displaySize / 2 - spritePadding - (crop.footY - crop.y) * scale + enemyBounceOffset(character);
  const drawX = crop.anchorX === undefined ? -width / 2 : -(crop.anchorX - crop.x) * scale;
  // Match attack hurtboxes to the rendered pose without changing contact-damage hitboxes.
  character.spriteHurtbox=animationSpriteHurtbox(character,getFrameRectangle,spritePadding);
  context.save();
  context.globalAlpha = opacity;
  context.translate(character.x - camera.x, character.y - camera.y + (character.bossVisualOffsetY||0));
  if(character.bossSquash) context.scale(1+(1-character.bossSquash)*.3,character.bossSquash);
  if (pose.mirrored) context.scale(-1, 1);
  context.drawImage(character.image, crop.x, crop.y, crop.width, crop.height,
    drawX, drawY, width, height);
  const flash = character.death
    ? 0.95 * Math.min(1, character.death.elapsed / 0.035)
    : getDamageFlashOpacity(character);
  if (flash > 0) {
    context.globalAlpha = opacity * flash;
    context.drawImage(getWhiteSprite(character.image), crop.x, crop.y, crop.width, crop.height,
      drawX, drawY, width, height);
    context.globalAlpha = opacity;
  }
  if (showSpriteBounds) {
    context.strokeStyle = '#e54b93';
    context.strokeRect(drawX, drawY, width, height);
    const body = getCombatHitbox(character, character !== characters[selected]);
    context.strokeStyle = '#ffcf60';
    context.beginPath();
    context.ellipse(body.x - character.x, body.y - character.y, body.rx, body.ry, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

/** Put tall map objects in front of actors walking behind their solid bases. */
function drawCharacterOcclusion(character) {
  if (enemyRenderLayer(character) !== 'normal') return; // Specials and bosses appear above map foregrounds.
  const opacity = character === characters[selected] ? obstacleVisibility.playerOpacity : 1;
  if (currentMap === 'first') drawOfficeMonumentOcclusion(context, character, maps.first, camera, canvas.height, opacity);
  if (currentMap === 'fourth') drawTowerOcclusion(context, character, maps.fourth, camera, opacity);
  if (currentMap === 'second') drawPalaceOcclusion(context, character, maps.second, camera, canvas.width, opacity);
}

/** Draw animation poses with a short blend when entering/leaving boss actions. */
function drawCharacter(character) {
  if (character.death && character.lastPose && !character.animationFrames) {
    drawPose(character, character.lastPose, 1);
    drawCharacterOcclusion(character);
    return;
  }
  if (character.animationFrames) {
    const frames=character.actionAnimations?.[character.bossAction?.clip] || character.animationFrames;
    const frame = frames[gifFrameAt(frames, character.bossAction?.clip ? (character.bossAction.elapsed||0)*1000 : character.gifElapsed || 0)];
    const image = frame.image;
    const animatedCharacter={...character,image};
    drawPose(animatedCharacter, {
      crop: { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight, footY: image.naturalHeight },
      mirrored: character.facing !== (character.nativeFacing || 'left')
    }, 1);
    character.spriteHurtbox=animatedCharacter.spriteHurtbox;
    drawCharacterOcclusion(character);
    return;
  }
  const pose = {
    crop: getFrameRectangle(character, getAnimationFrame(character)),
    mirrored: character.mirroredDirections?.includes(character.direction)
  };
  const transition = character.transition;
  if (transition) {
    const progress = Math.min(1, transition.elapsed / character.transitionDuration);
    drawPose(character, transition.from, 1 - progress);
    drawPose(character, pose, progress);
    if (progress === 1) character.transition = null;
  } else {
    drawPose(character, pose, 1);
  }
  character.lastPose = pose;
  drawCharacterOcclusion(character);
}

/** Score and queue one campaign transition after its full checkpoint/clock conditions are met. */
function advanceStageAfterClear() {
  if(gachaFiles?.active||gachaFiles?.count){awaitingFileStageAdvance=true;return;}
  if(pendingStageTransition) return;
        if (!endlessMode) {
          const result = runScore.complete({character:characters[selected],elapsedSeconds:survivalClock.seconds,
            stage:currentMap,hardcore:characters[selected].hardcore === true});
          window.dispatchEvent(new CustomEvent('run-score-calculated',{detail:result}));
        }
        const next = nextStageAfterBoss(currentMap, endlessMode,
          Object.keys(maps).filter(id => !maps[id].disabled));
        if (next.endless && !endlessMode) {
          endlessMode = true;
          endlessStartedAt = survivalClock.seconds; // Stage 4 completion starts endless timers exactly once.
        }
        pendingStageTransition = next.mapId;
}

/** Update and render only the active avatar; the inactive character stays hidden. */
function animate(time) {
  const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  mapAudio?.update(delta);
  const activeCharacter = characters[selected];
  levelUpMenu?.update();
  survivalClock.advance(delta, isGameplayPaused(), !isPlayerDefeated(activeCharacter));
  if (endlessMode && isPlayerDefeated(activeCharacter)) {
    const result = runScore.complete({character: activeCharacter, elapsedSeconds:survivalClock.seconds,
      stage:currentMap,endless:true,hardcore:activeCharacter.hardcore === true});
    if (result) window.dispatchEvent(new CustomEvent('run-score-calculated',{detail:result}));
  }
  const direction = isGameplayPaused() ? undefined : getMovementDirection();
  if (!isGameplayPaused()) {
    // Queue progression until any existing background ripple finishes; never lose a boss-clear transition.
    if (pendingStageTransition && !mapTransition?.active && switchMap(pendingStageTransition)) {
      pendingStageTransition = null;
    }
    skillCasting?.update(delta);
    updateDamageNumbers(delta);
    playerStatsTools?.update();
    advanceDamageFlash(characters[selected], delta);
    hud?.update(characters[selected]);
    if (activeCharacter.animationFrames) activeCharacter.gifElapsed = (activeCharacter.gifElapsed || 0) + delta * 1000 * (activeCharacter.animationSpeed || 1);
    if (activeCharacter.transition) activeCharacter.transition.elapsed += delta * 1000;
    const playerBefore = { x: activeCharacter.x, y: activeCharacter.y };
    updateCharacter(activeCharacter, delta, direction);
    const playerMotion = { x: activeCharacter.x - playerBefore.x, y: activeCharacter.y - playerBefore.y };
    updateCamera(delta);
    npcTools?.cleanup(); // Reclaim distant/invalid NPC slots before the next spawn batch.
    if (campaignSettings.enabled && !endlessMode && !pendingStageTransition && !isPlayerDefeated(activeCharacter)) {
      campaignSchedule.update(delta, row=>Boolean(playtestSpawner?.running)&&npcTools.spawnCampaignEncounter(row));
      if(campaignSchedule.readyToAdvance) advanceStageAfterClear();
    }
    const campaignStatus=document.querySelector('#campaign-clock-status');
    if(campaignStatus) campaignStatus.textContent=`Internal chart: ${Math.floor(campaignSchedule.seconds/60)}:${String(Math.floor(campaignSchedule.seconds)%60).padStart(2,'0')}${campaignSchedule.frozen?' (frozen)':''}`;
    endlessBuildup.update(delta, { endless: endlessMode && eventTriggerSettings.enabled,
      bossAlive: getAllEnemies().some(isBossEnemy), spawning: Boolean(playtestSpawner?.running) });
    const buildupStatus = document.querySelector('#endless-buildup-status');
    if (buildupStatus) buildupStatus.textContent = endlessMode || endlessBuildup.active
      ? `Event: ${endlessBuildup.name} (${endlessBuildup.phase}). Cycle time: ${Math.floor(endlessBuildup.seconds)}s. Elite chance: ${(endlessBuildup.eliteChance * 100).toFixed(1)}%.`
      : 'Endless buildup: available after Stage 4.';
    bossSpawner?.update(delta);
    playtestSpawner?.update(delta, playerMotion);
    npcTools?.update(delta, playerMotion);
    const attackFacing = activeCharacter.horizontalFacingOnly
      ? activeCharacter.facing : activeCharacter.direction;
    const aimAngle = aiming.getAngle(activeCharacter, camera.x, directionVectors[attackFacing], camera.y);
    luminousSkill?.update(delta,activeCharacter);
    princessSkill?.update(delta,activeCharacter,aimAngle);
    luminousAttack?.setSkillFinishing(Boolean(luminousSkill?.finishing));
    umbrellaAttack?.update(delta, activeCharacter, aimAngle);
    arisAttack?.update(delta, activeCharacter, aimAngle);
    luminousAttack?.update(delta,activeCharacter,aimAngle);
    princessAttack?.setExMode(Boolean(princessSkill?.casting),Boolean(princessSkill?.sprayActive));
    princessAttack?.update(delta,activeCharacter,aimAngle,{x:camera.x,y:camera.y,width:canvas.width,height:canvas.height});
    planaSkill?.update(delta);
    expPickups?.update(activeCharacter, playerBefore, delta);
    levelUpMenu?.update();
    if(!levelUpMenu?.active) {
      crafters?.update(activeCharacter,playerBefore);
      if(!crafters?.active)goldenCrafters?.update(activeCharacter,playerBefore);
      if(!crafters?.active&&!goldenCrafters?.active)gachaFiles?.update(activeCharacter,playerBefore);
    }
    hud?.update(activeCharacter);
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayarea();
  mapTransition?.draw(context, isGameplayPaused() ? 0 : delta);
  if (currentMap === 'fourth' && showSpriteBounds) drawIsland(context, maps.fourth, camera, true);
  if (currentMap === 'third' && showSpriteBounds) {
    context.save();
    context.strokeStyle = '#ffcf60';
    for (const box of obstaclesIn(camera.x, camera.y, camera.x + canvas.width, camera.y + canvas.height)) {
      context.strokeRect(box.left - camera.x, box.top - camera.y, box.right - box.left, box.bottom - box.top);
    }
    context.restore();
  }
  if (currentMap === 'first' && showSpriteBounds) {
    context.save();
    context.strokeStyle = '#ffcf60';
    for (const box of officeObstaclesIn(maps.first, canvas.height, camera.x, camera.y,
      camera.x + canvas.width, camera.y + canvas.height)) {
      context.strokeRect(box.left - camera.x, box.top - camera.y, box.right - box.left, box.bottom - box.top);
    }
    context.restore();
  }
  if (currentMap === 'second' && showSpriteBounds) {
    context.save();
    context.strokeStyle = '#ffcf60';
    for (const box of palaceObstaclesIn(maps.second, canvas.width, camera.x, camera.y,
      camera.x + canvas.width, camera.y + canvas.height)) {
      context.strokeRect(box.left - camera.x, box.top - camera.y, box.right - box.left, box.bottom - box.top);
    }
    context.restore();
  }
  expPickups?.draw(context, camera, canvas.width, canvas.height);
  crafters?.draw(context,camera,canvas.width,canvas.height);
  goldenCrafters?.draw(context,camera,canvas.width,canvas.height);
  gachaFiles?.draw(context,camera);
  npcTools?.draw(context);
  npcTools?.drawSpecials(); // Specials render above regular enemies.
  npcTools?.drawBosses(); // Bosses render above other enemies, below the controlled player.
  arisAttack?.draw(context, camera);
  luminousAttack?.draw(context,camera);
  princessAttack?.draw(context,camera);
  princessSkill?.draw(context,camera);
  luminousSkill?.draw(context,camera);
  planaSkill?.draw(context, camera); // EX umbrella and its trail stay behind the player.
  // Canvas shadows follow the current frame's alpha silhouette, keeping the aura on the sprite.
  context.save();
  if(luminousSkill?.auraActive||princessSkill?.auraActive) {
    context.shadowColor='rgba(255,105,215,.85)';
    context.shadowBlur=12;
  }
  drawCharacter(activeCharacter); // The player is the highest-priority actor.
  context.restore();
  umbrellaAttack?.draw(context, camera);
  survivalDisplay?.draw(context, survivalClock.seconds, canvas.width, canvas.height);
  drawDamageNumbers(context, camera, canvas.width, canvas.height);
  const facing = activeCharacter.horizontalFacingOnly ? activeCharacter.facing : activeCharacter.direction;
  aiming?.draw(context, activeCharacter, camera.x, directionVectors[facing], camera.y);
  for (const button of document.querySelectorAll('[data-admin-skill-slot]')) {
    const slot = Number(button.dataset.adminSkillSlot);
    button.disabled = !adminSkillResult(activeCharacter, slot).valid;
  }
  document.querySelector('#switch-map').disabled = Boolean(mapTransition?.active);

  const action = activeCharacter.attack
    ? activeCharacter.attacks[activeCharacter.attack.name].label
    : direction || 'idle';
  const description = `${activeCharacter.label} / ${action} / camera X ${Math.round(camera.x)} / Y ${Math.round(camera.y)} / ${maps[currentMap].label}`;
  if (status.textContent !== description) status.textContent = description;
  requestAnimationFrame(animate);
}

/** Knockback collides with solid map props even though ordinary enemy walking ignores them. */
function canKnockbackStand(enemy, x, y) {
  const body = getCombatHitbox({ ...enemy, x, y }, true);
  const map = maps[currentMap];
  if (currentMap === 'fourth') return canPlaceIslandLoot(body.x, body.y, Math.max(body.rx, body.ry), map);
  const bounds = stripMapBounds(map, canvas.width, canvas.height, topMovementPadding, bottomMovementPadding);
  if (body.x-body.rx < bounds.left || body.x+body.rx > bounds.right ||
      body.y-body.ry < bounds.top || body.y+body.ry > bounds.bottom) return false;
  const boxes = currentMap === 'first'
    ? officeObstaclesIn(map, canvas.height, body.x-body.rx, body.y-body.ry, body.x+body.rx, body.y+body.ry)
    : currentMap === 'second'
      ? palaceObstaclesIn(map, canvas.width, body.x-body.rx, body.y-body.ry, body.x+body.rx, body.y+body.ry)
      : obstaclesIn(body.x-body.rx, body.y-body.ry, body.x+body.rx, body.y+body.ry);
  return boxes.every(box => body.x+body.rx <= box.left || body.x-body.rx >= box.right ||
    body.y+body.ry <= box.top || body.y-body.ry >= box.bottom);
}

/** Validate loot ground footprints against player obstacles, never the enemy obstacle bypass. */
function isLootLandingClear(x, y, radius) {
  const map = maps[currentMap];
  if (currentMap === 'fourth') return canPlaceIslandLoot(x, y, radius, map);
  const bounds = stripMapBounds(map, canvas.width, canvas.height, topMovementPadding, bottomMovementPadding);
  if (x-radius < bounds.left || x+radius > bounds.right ||
      y-radius < bounds.top || y+radius > bounds.bottom) return false;
  const boxes = currentMap === 'first'
    ? officeObstaclesIn(map, canvas.height, x-radius, y-radius, x+radius, y+radius)
    : currentMap === 'second'
      ? palaceObstaclesIn(map, canvas.width, x-radius, y-radius, x+radius, y+radius)
      : obstaclesIn(x-radius, y-radius, x+radius, y+radius);
  return boxes.every(box => x+radius <= box.left || x-radius >= box.right ||
    y+radius <= box.top || y-radius >= box.bottom);
}

// Start the preview only for the authorized development account.
if (authorized) {
  crafters=createCrafterSystem({getPlayer:()=>characters[selected],canvas,
    onOpen:()=>{releaseControls();skillCasting?.cancel('pause');},
    onChange:()=>{hud?.update(characters[selected]);playerStatsTools?.update();},
    onResult:message=>{status.textContent=message;}});
  goldenCrafters=createCrafterSystem({getPlayer:()=>characters[selected],canvas,golden:true,
    getMinuteTimer:()=>Math.floor(survivalClock.seconds/60),
    onOpen:()=>{releaseControls();skillCasting?.cancel('pause');},
    onChange:()=>{hud?.update(characters[selected]);playerStatsTools?.update();},
    onResult:message=>{status.textContent=message;}});
  gachaFiles=createGachaFiles({canvas,getPlayer:()=>characters[selected],onOpen:()=>{releaseControls();skillCasting?.cancel('pause');},onChange:()=>{hud?.update(characters[selected]);if(awaitingFileStageAdvance&&!gachaFiles?.active&&gachaFiles?.count===0){awaitingFileStageAdvance=false;advanceStageAfterClear();}}});
  for(const type of ['normal','triple','super'])document.querySelector(`#spawn-${type}-file`).addEventListener('click',()=>{const p=characters[selected];gachaFiles.spawn(p.x-70,p.y,type);});
  document.querySelector('#spawn-golden-crafter').addEventListener('click',()=>{
    const player=characters[selected];goldenCrafters.spawn(player.x-80,player.y);
  });
  document.querySelector('#spawn-crafter').addEventListener('click',()=>{
    const player=characters[selected];crafters.spawn(player.x+80,player.y);
  });
  Promise.all([...Object.values(characters), ...Object.values(maps).filter(map => map.source && !map.disabled), ...maps.first.tiles, ...maps.second.tiles, ...maps.third.tiles].map(loadSheet).concat(gachaFiles.ready,goldenCrafters.ready,crafters.ready, aiming.ready, expPickups.ready, loadEnemyDeathGraphics(), umbrellaAttack.ready, arisAttack.ready,luminousAttack.ready,luminousSkill.ready,princessSkill.ready, planaSkill.ready, loadDamageNumberGraphics()))
    .then(() => {
      observeViewport(canvas, () => {
        mapTransition?.cancel();
        // Resize the view, never entity coordinates, sprite sizes, or map 3/4 scale.
        updateCamera();
      });
      resetScene();
      setupFullscreenPreview(canvas, releaseControls);
      updateAttackControls();
      setupSpriteTester(characters, switchCharacter);
      mapAudio = createMapAudio(currentMap);
      Object.values(characters).forEach(ensurePlayerStats);
      hud = createHud(getFrameRectangle);
      skillCasting = createSkillCasting({ canvas, aiming,
        getPlayer: () => characters[selected], getCharacters: () => Object.values(characters),
        isPaused: () => isGameplayPaused(),
        getCastAngle: () => {
          const player = characters[selected];
          const facing = player.horizontalFacingOnly ? player.facing : player.direction;
          return aiming.getAngle(player, camera.x, directionVectors[facing] || directionVectors.down, camera.y);
        },
        onRecognized: detail => {
          if (detail.skillId === 'plana-umbrella-launch') planaSkill.cast(detail.player, detail.angle, detail.damageMultiplier, () => {
            const player = detail.player;
            const facing = player.horizontalFacingOnly ? player.facing : player.direction;
            return aiming.getAngle(player, camera.x, directionVectors[facing] || directionVectors.down, camera.y);
          });
          if (detail.skillId === 'supernova-beam') arisAttack.cast(detail.player, detail.angle, detail.damageMultiplier, () => {
            const player = detail.player;
            return aiming.getAngle(player, camera.x, directionVectors[player.direction] || directionVectors.down, camera.y);
          });
          if(detail.skillId==='luminous-nova-aura')luminousSkill.cast(detail.player,detail.angle,()=>{
            const player=detail.player;return aiming.getAngle(player,camera.x,directionVectors[player.direction]||directionVectors.down,camera.y);
          });
          if(detail.skillId==='princess-key-ex') {
            princessAttack.setExMode(true,false);
            princessSkill.cast(detail.player,detail.angle,detail.damageMultiplier,()=>aiming.getAngle(detail.player,camera.x,directionVectors[detail.player.direction]||directionVectors.down,camera.y));
          }
          window.dispatchEvent(new CustomEvent('skill-drawing-recognized' , { detail }));
        }
      });
      document.querySelector('#disable-autoattack').addEventListener('change', event => {
        const enabled=!event.target.checked;
        umbrellaAttack.setAutoattackEnabled(enabled);
        arisAttack.setAutoattackEnabled(enabled);
        luminousAttack.setAutoattackEnabled(enabled);
        princessAttack.setAutoattackEnabled(enabled);
      });
      // Generate one testing button per implemented synergy, without requiring MAX ingredients.
      for(const recipe of synergyRecipes) {
        const button=document.createElement('button');button.type='button';
        button.textContent=`Equip ${recipe.result.name}`;
        button.addEventListener('click',()=>{
          const player=characters[selected];player.attackSlots??=[];
          if(player.attackSlots.some(item=>item?.id===recipe.result.id))return;
          let index=player.attackSlots.findIndex(item=>!item);
          if(index<0)index=player.attackSlots.length;
          if(index>=6){status.textContent='No empty weapon slot available.';return;}
          const weapon=recipe.createWeapon?recipe.createWeapon():{...recipe.result};
          player.attackSlots[index]={...weapon,level:1,isSynergy:true,consumedWeaponIds:[...recipe.ingredients]};
          hud.update(player);
        });
        document.querySelector('#admin-equip-synergies').append(button);
      }
      document.querySelector('#admin-equip-luminous').addEventListener('click',()=>{
        const player=characters[selected];if(getLuminousNova(player))return;
        player.attackSlots??=[];const empty=player.attackSlots.findIndex(item=>!item);
        if(empty>=0)player.attackSlots[empty]=createLuminousNovaWeapon();
        else if(player.attackSlots.length<6)player.attackSlots.push(createLuminousNovaWeapon());
        hud.update(player);
      });
      document.querySelector('#admin-equip-aris').addEventListener('click', () => {
        const player = characters[selected];
        if (getArisWeapon(player)) return;
        player.attackSlots ??= [];
        const empty = player.attackSlots.findIndex(item => !item);
        if (empty >= 0) player.attackSlots[empty] = createArisWeapon();
        else if (player.attackSlots.length < 6) player.attackSlots.push(createArisWeapon());
        hud.update(player);
      });
      document.querySelector('#admin-reset-cooldowns').addEventListener('click', () => skillCasting.resetCooldowns());
      for (const button of document.querySelectorAll('[data-admin-skill-slot]')) {
        button.addEventListener('click', () => skillCasting.castSlot(Number(button.dataset.adminSkillSlot)));
      }
      playerStatsTools = createPlayerStatsTools(() => characters[selected], character => hud.update(character));
      hud.update(characters[selected]);
      npcTools = createNpcTools({ canvas, characters, camera,
        getPlayer: () => characters[selected],
        getEliteChance: () => endlessMode || endlessBuildup.active ? endlessBuildup.eliteChance : undefined,
        getSurvivalSeconds: () => survivalClock.seconds,
        getInternalSeconds: () => campaignSchedule.seconds + (endlessMode ? Math.max(0, survivalClock.seconds - endlessStartedAt) : 0), getEventStage: () => campaignSchedule.stage,
        getCampaignSpawn: () => campaignSettings.enabled ? (pickEndlessEnemy(campaignSchedule.seconds + (endlessMode ? Math.max(0, survivalClock.seconds - endlessStartedAt) : 0)) || campaignSchedule.pickSpawn()) : null,
        campaignActive: () => campaignSettings.enabled,
        getCampaignProfile: type => campaignSettings.enabled && !endlessMode ? campaignSchedule.profileFor(type) : null,
        getStageId: () => currentMap, getStageSeconds: () => survivalClock.seconds-stageEnteredAt,
        timedSpawnsEnabled: () => Boolean(playtestSpawner?.running),
        getEndlessSeconds: () => endlessMode ? Math.max(0, survivalClock.seconds - endlessStartedAt) : null,
        getPlayerDamage: () => Math.max(1, Math.round(umbrellaSettings.damage * umbrellaSettings.damageMultiplier * umbrellaLevelStats(characters[selected]).damageMultiplier * statMultiplier(characters[selected], 'atkPercent'))),
        isVertical: () => maps[currentMap].axis === 'vertical',
        isFreeScroll: () => currentMap === 'third' || currentMap === 'fourth',
        isPlacementClear: (character, x, y) => currentMap === 'fourth'
          ? canStandOnIsland(character, x, y, maps.fourth, true)
          : currentMap === 'third' || canSpawnInStrip(character, x, y,
            stripMapBounds(maps[currentMap], canvas.width, canvas.height, topMovementPadding, bottomMovementPadding)),
        canKnockbackStand: canKnockbackStand,
        updateCharacter, drawCharacter, baseMovementSpeed: movementSpeed,
        allowMultipleBosses: () => endlessMode,
        getBossLimit: () => endlessMode ? bossWaveLimit(bossSpawner?.endlessKills || 0) : 1 });
      const getSpawnStage = () => {
        const stage = { ...maps[currentMap], id: currentMap,
          playableBounds: stripMapBounds(maps[currentMap], canvas.width, canvas.height, topMovementPadding, bottomMovementPadding) };
        stage.availableSides = offscreenSpawnSides(stage, camera, canvas.width, canvas.height);
        return stage;
      };
      playtestSpawner = createPlaytestSpawner({ canvas, camera,
        getStage: getSpawnStage,
        getSpawnRate: rate => endlessMode || endlessBuildup.active ? endlessBuildup.spawnRate(rate) : rate,
        spawnEnemy: (x, y) => npcTools.spawnEnemy(x, y, endlessBuildup.spawnType, endlessBuildup.spawnEventKey), slotsRemaining: npcTools.slotsRemaining,
        onBatch: npcTools.refresh, getEnemies: npcTools.getEnemies, getPlayer: () => characters[selected] });
      // Event shortcuts start the stream immediately; stop returns to ordinary arrivals.
      for (const button of document.querySelectorAll('[data-dev-event]')) {
        button.addEventListener('click', () => {
          const status = document.querySelector('#event-test-status');
          const id = button.dataset.devEvent;
          if (id === 'end') {
            endlessBuildup.end();
            status.textContent = 'Event ended. Its enemies die without drops; ordinary spawning resumes.';
            return;
          }
          if (id === 'stop') {
            endlessBuildup.stop();
            playtestSpawner.setRunning(false);
            status.textContent = 'Event stopped; random spawning paused.';
            return;
          }
          if (getAllEnemies().some(isBossEnemy) || bossSpawner?.hasPendingWave) {
            status.textContent = 'Remove or defeat the active boss wave before testing an event.';
            return;
          }
          endlessBuildup.trigger(id);
          playtestSpawner.setRunning(true);
          status.textContent = `${endlessBuildup.name} started. Admin seed 0 still uses 1 HP.`;
        });
      }
      bossSpawner = createBossSpawner({ canvas, camera, getStage: getSpawnStage,
        getSurvivalSeconds: () => survivalClock.seconds, automaticEnabled: () => Boolean(playtestSpawner?.running),
        getEndlessSeconds: () => endlessMode ? Math.max(0, survivalClock.seconds - endlessStartedAt) : null,
        spawnBoss: npcTools.spawnBoss, slotsRemaining: npcTools.slotsRemaining,
        canSpawnWave: () => !(campaignSettings.enabled && !endlessMode) && !pendingStageTransition && (!(endlessMode || endlessBuildup.active) || endlessBuildup.allowsBossWave),
        onSpawn: npcTools.refresh, isEndless: () => endlessMode,
        getBossTypes: () => Object.keys(characters).filter(type => characters[type].boss) });
      onEnemyDefeat(({ enemy }) => {
        crafters?.roll(enemy);
        goldenCrafters?.roll(enemy);
        gachaFiles?.roll(enemy);
        runScore.recordDefeat(enemy);
        campaignSchedule.recordDefeat(enemy);
        if(pendingStageTransition) return;
        if(campaignSettings.enabled && !endlessMode) {
          if(!campaignSchedule.readyToAdvance) return;
        } else if(!bossWaveIsDefeated(enemy,getAllEnemies(),bossSpawner.hasPendingWave)) return;
        advanceStageAfterClear();
      });
      levelUpMenu = createLevelUpMenu({ canvas, getPlayer: () => characters[selected],
        isPauseMenuOpen: () => Boolean(pauseMenu?.paused || crafters?.active || goldenCrafters?.active || gachaFiles?.active), releaseControls,
        onOpen: () => skillCasting?.cancel('levelup'),
        onChoose: player => { hud.update(player); playerStatsTools.update(); }
      });
      pauseMenu = createPauseMenu({ canvas, isBlocked: () => Boolean(levelUpMenu?.active || crafters?.active || goldenCrafters?.active || gachaFiles?.active), getPlayer: () => characters[selected], releaseControls,
        onPause: () => skillCasting?.cancel('pause') });
      document.querySelector('#run-seed-status').textContent = `Run seed: ${runSeed} | Started: ${runStartedAt.toLocaleString()}`;
      requestAnimationFrame(animate);
    })
    .catch(error => { status.textContent = error.message; });
}
