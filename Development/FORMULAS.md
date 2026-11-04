> Current campaign: campaign-config.js. Current events: event-config.js / seeded-events.js. The replacement event chart is active; old timedEnemyEvents entries below are historical. Stage2 resumes13:00-14:00 after both checkpoints.

# Gameplay formulas and editable balance

Edit **[game-config.js](game-config.js)**, save, and reload the Development page. This is the live configuration imported by gameplay, not a second list of unused values. Formula functions are at the bottom; named settings are above them. Change a value such as `umbrellaSettings.damage: 23` to change gameplay.

Probabilities use 0?1: `0.01` = 1%, `0.001` = 0.1%. Distances/speeds use world pixels and seconds. `round` rounds halves upward. Formula variables: `L` = current player level, `T` = report tier (0?3), `D` = normal attack damage including ATK bonus, `N` = nearby enemy count, `K` = eligible kills since last boss wave.

**Admin seed 0 forces every enemy to 1 HP**, overriding all normal HP formulas below. Use **Reroll seed / new game** to test normal health. Random spawning starts off. New settings take effect after reload; existing runs do not hot-reload config.

## Players, damage and shields

| Correspondence | Formula / current value | Edit in game-config.js |
| --- | --- | --- |
| Plana starting HP | 110 | `playerSettings.planaHp` |
| Arona starting HP | 140 | `playerSettings.aronaHp` |
| Player base speed | 240 px/s | `playerSettings.speed` |
| Ordinary NPC base speed | 84 px/s | `playerSettings.npcSpeed` |
| ATK/SPD/Pickup/Haste multiplier | `1 + max(0, bonusPercent)/100` | `percentBonusFormula` |
| Normal attack damage | `max(1, round(baseDamage * ATKMultiplier))` | `attackDamageFormula`, `umbrellaSettings.damage` |
| Critical chance | `clamp(CRIT%, 0, 100)/100` | Starting `defaultCombatStats.critPercent`; per-character admin stats |
| Critical damage | `round(baseDamage * ATKMultiplier * 2)` | `combatBalance.criticalMultiplier` |
| Supercritical trigger | Not defined yet; visual style only | No trigger exists |
| Player movement | `baseSpeed * SPDMultiplier`, normalized diagonals | `playerSettings`, `percentBonusFormula` |
| Attack interval | `1 second / HasteMultiplier` | `umbrellaSettings.interval` |
| Swing duration | `0.2 seconds / HasteMultiplier` | `umbrellaSettings.duration` |
| Umbrella sweep / reach | 190 degrees; radius 64?176px | `umbrellaSettings` |
| Shield capacity / filled fraction | `maxHP`; `shield / maxHP` | Fixed HP-cap rule in `player-stats.js` / `hud.js` |
| Accepted hit | `absorbed=min(shield,damage)`; HP loses `damage-absorbed` | `damagePlayer` in `player-stats.js` |
| Enemy damage scaling | `floor(enemyBaseDamage * variantMultiplier * (1 + (L/6)*(survivalMinutes/4)))`; round down only after multiplying | `enemyContactDamageFormula`, `enemyDamageScaling` |
| I-frames | 0.2 seconds after an accepted contact | `contactSettings.iFrameDuration` |
| Level-up heal | HP restored to max; shield unchanged | `addPlayerExp` in `player-stats.js` |
| Death protection | Can reach 0 HP but cannot die | `developmentSettings.invincible` |

All starting stat bonuses are 0% (`defaultCombatStats`). Plana pickup radius is `99 * PickupMultiplier`; Arona starts at 0. Movement multiplier normalization uses `playerSettings.movementBase` (180); changing it alone does not change configured player/NPC travel speeds.

## Enemy health, size and contact damage

| Enemy / property | Formula / current value | Config key |
| --- | --- | --- |
| Normal Mob HP | `round(60 + (350-60)*(survivalSeconds/900)^1)` on spawn | `basicMobHpFormula`, `mobBaseHp`, `mobHealthScaling` |
| Elite Mob HP | `current scaled MobHP * 10` (600 initially, 3,500 at 15min) | `combatBalance.eliteHpMultiplier` |
| Elite chance | Repeatable boss buildup:1% through5min, ramp to100% at10min,hold3min,clear elites/boss wave/reset | `eliteChance`, `endlessEliteSettings`, `eliteChanceFormula` |
| Shiroko HP | `MobHP * 100` = 6,000 | `shirokoBossStats.hpMultiplier` |
| Iroha / other test NPC HP | 100 | `combatBalance.otherEnemyHp` |
| Yuuka spawn HP | `max(1, round((D + 100)/100 * 900))`; D=250 gives 3,150 | `yuukaHpFormula`, `yuukaHpSettings` |
| Normal sprite area | 89.6px | `normalSpriteSize` |
| Boss sprite area | `normalSize * 3` = 268.8px | `bossSpriteSize` |
| Elite sprite area | `normalSize * 1.98` = 177.408px | `eliteSizeMultiplier` |
| Yuuka sprite area | `bossSize * 0.9` = 241.92px | `yuukaSettings.sizeRatio` |
| Mob / elite base contact damage | 1 / `1 * 2` | `contactSettings.mobDamage`, `combatBalance.eliteContactMultiplier` |
| Shiroko base contact damage | 10 | `shirokoBossStats.contactDamage` |
| Yuuka base contact damage | 2 | `yuukaSettings.contactDamage` |
| Yuuka repeated-hit cooldown | Same Yuuka cannot damage player again for 3s after an accepted hit; separate from global I-frames | `yuukaSettings.contactHitInterval` |
| Other NPC base contact damage | 10 unless template overrides | `contactSettings.playerDamage` |
| Yuuka movement | `playerBaseSpeed * 2` = 480px/s | `yuukaSettings.speed` |
| Yuuka early roaming limit | First 30 seconds: at most 300px beyond viewport (measured from sprite edge) | `yuukaSettings.protectedSeconds/protectedOffscreenLimit` |
| Yuuka escape | After 30 seconds: 10% roll per outward crossing beyond 100px offscreen; re-enter within 100px to rearm | `yuukaSettings.escapeDistance/escapeChance` |
| Yuuka turns | New random heading every 0.12?0.35s; steer back beyond 500px | `yuukaSettings.turnMin/turnMax/roamRadius` |

Yuuka HP is determined at spawn from the current umbrella base damage and ATK%, without a random critical multiplier. She can replace a regular streamed arrival, or be selected manually. Successful Yuuka spawns reset her kill-based cooldown/pity. Admin/manual spawns bypass the kill gate, cooldown and one-living-Yuuka limit for testing; they still reset automatic cooldown/pity. Boss and elite hitboxes scale with sprite size. Per-sheet crops and collision profiles remain in `sprite-layouts.js` and `combat-hitboxes.js` because they describe artwork, rather than balance.

## EXP and reports

| Correspondence | Formula / current value | Config key |
| --- | --- | --- |
| First level requirement | 50 EXP | `startingLevelExp` |
| Requirement increase on leveling | `round(15 + L/2)` | `expIncreasePerLevel`, `progressionSettings.increaseDivisor` |
| Full requirement at level L | `50 + sum(round(15 + k/2), k=1..L-1)` | `levelExpFormula` |
| Standard Mob EXP | `round(3 + L/(2+T))` | `mobExpFormula`, `reportSettings.mobBase/mobDivisor` |
| Standard report tier | 90% Report 0; 10% Report 1; artwork tier stays as rolled | `reportSettings.commonChance` |
| Elite and Yuuka report count | 5 each | `eliteExpRewards.count` |
| Elite and Yuuka initial report rolls | 80% second report (11?20 EXP), 20% third (21?49 EXP) | `reportSettings.eliteSecondChance`, min/max fields |
| Elite and Yuuka total | `min(round(oldRolledTotal * 0.4), 3 * round(3 + L/2))`, shared across reports | `eliteExpTotalFormula`, `eliteExpRewards.rewardMultiplier/normalCapMultiplier` |
| Elite pre-reduction floor | Old report rolls are topped up to 150 before reduction/cap; this is not a final minimum | `eliteExpRewards.minimumTotal` |
| Boss total EXP | Random integer from `max(50, ceil(requirement*.8))` to `max(minimum, floor(requirement*1.5))` | `bossExpRewards.minLevels/maxLevels/minimumReports` |
| Boss report count | `max(50, ceil(total / 49))` | `bossExpRewards.minimumReports`, `reportSettings.thirdMax` |
| Boss split | `base=floor(total/count)`; distribute remainder one point/report | `rollBossReports` in `exp-drops.js` |

Level-up retains EXP overflow and supports multiple levels from one pickup. Normal Mob EXP is not clamped to the old report value bands. Other non-Mob test NPCs retain fallback random report values (1?9 or 11?20). Explicit admin EXP overrides still apply; elite/Yuuka overrides still undergo reduction and the combined cap. At level 1 the combined cap is 12 EXP; at level 10 it is 24 EXP. At high levels, a pre-reduction total of 150 gives 60 EXP. Artwork follows each final report value. Keep `count * thirdMax >= minimumTotal` when editing elite rewards so the minimum is attainable.

## Credits, loot scatter and pickup

| Correspondence | Formula / current value | Config key |
| --- | --- | --- |
| Normal credit chance | `1/90` (~1.11%); 1 credit | `creditDropChance` |
| Normal Secret Tech Note chance | 0.1% | `secretNoteDropChance` |
| Elite credits | 20% chance, 5 credits | `eliteLoot.creditChance/creditAmount` |
| Elite notes | 1% chance | `eliteLoot.noteChance` |
| Yuuka hit credits | 1 per accepted hit, including final hit | `yuukaSettings.hitCredits` |
| Yuuka death credits | 100 additional individual credits, plus elite EXP reports | `yuukaSettings.deathCredits` |
| Ordinary scatter | Random angle; distance 40?80px; duration .28s; hop 18px | `dropScatter` |
| Boss report scatter | Full-circle sectors; distance 92?211.6px | `bossExpRewards.minDistance/maxDistance` |
| Yuuka death scatter | `distance=sqrt(random) * bossMaxRadius * 1.3`; fills disk, not only edge | `yuukaSettings.burstRadiusMultiplier` |
| Yuuka maximum credit radius | `211.6 * 1.3` = 275.08px | Same keys as above |
| Landing clearance | 32px footprint; search nearby walkable ground if blocked | `lootLandingRadius` |
| Pickup attraction | `range=baseRange * PickupMultiplier` | `playerSettings.planaPickup/aronaPickup` |
| Pickup speed | `min(650, previousSpeed + 1200 * deltaSeconds)` | `pickupMagnet` |
| Walk-over radius | 26px | `pickupSettings.walkOverRadius` |
| Icon width | 35px | `pickupSettings.iconWidth` |

Landing correction can move a report beyond its requested scatter radius to avoid water, walls or obstacles. Rewards are preserved pending placement if no valid ground is found. Drops remain until collected or the map changes. Yuuka keeps her credit-specific loot instead of ordinary credit/note rolls.

## Spawning, boss charge and cleanup

| Correspondence | Formula / current value | Config key |
| --- | --- | --- |
| Nearby enemy count N | Enemies within 400px of player | `playtestSpawnSettings.nearbyRadius` |
| Spawn rate | `round(5 + (8-5)*(1-min(1,N/40)))` | `spawnRateFormula`, `playtestSpawnSettings` |
| Crowded slowdown | 2/s at or above 50 visible slots | `visibleLimit`, `crowdedPerSecond` |
| Direction distribution | Equal successful arrivals across valid edges; crowd density breaks ties. Optional `'leastCrowded'` mode uses 90% density priority | `playtestSpawnSettings.distribution/leastCrowdedChance` |
| Arrival spacing | About `(1 +/- .15)/rate` seconds; no catch-up waves | `streamJitter` |
| Yuuka base chance | 0% before 100 kills; then 0.25% per regular arrival when no Yuuka is alive | `yuukaSpawnSettings.baseChance` |
| Special enemy odds during boss | `normalChance * .2` (80% reduction); Yuuka .25% becomes .05%, capped 2.5% becomes .5% | `specialEnemySettings.bossSpawnMultiplier` |
| Yuuka initial unlock | 100 kills before any automatic chance | `yuukaSpawnSettings.unlockKills` |
| Yuuka population limit | Automatic spawns allow only one living Yuuka; admin/manual spawns can bypass | `canSpawnYuuka` in `yuuka.js` |
| Yuuka cooldown | No new Yuuka until 100 kills after her last spawn | `yuukaSpawnSettings.cooldownKills` |
| Yuuka pity | `min(.025, .0025 + floor(max(0,K-500)/50)*.005)`; K counts kills since her last spawn | `yuukaSpawnChanceFormula`, `yuukaSpawnSettings` |
| Boss unlock chance | 0 before 1,000 eligible kills; then 0.01%/kill | `bossSpawnSettings.unlockKills/baseChance` |
| Boss pity 5min after Stage4 | Unlock/pity500, guaranteed1500kills; current charge preserved, frozen while bosses live | `lateEndlessSeconds/lateUnlockKills/latePityStart/lateGuaranteedKills` |
| Boss pity before 5min endless | `baseChance + (1-baseChance)*clamp((K-1500)/(3000-1500),0,1)` | `bossChanceFormula`, `pityStart/guaranteedKills` |
| Endless wave size | 2 unique bosses; 3 slots after 5,000 endless kills, capped by available unique types | `waveSize/unlockedWaveSize/thirdBossUnlockKills` |
| Population cap | 400 | `enemyPopulationSettings.limit` |
| Trim trigger / target | `ceil(cap*.9)` / `floor(cap*.7)` = 360 / 280 | `trimAt/trimTo` |
| Normal despawn margin | 100px beyond visible area; also outside playable map | `despawnDistance` |
| Boss catch-up trigger | More than 150px offscreen | `bossCatchupSettings.distance` |
| Boss catch-up speed | `max(enemySpeed*2, playerSpeed*1.35+60)` until visible | `bossCatchupSettings` |

Yuuka chance is 0.25% at 500 kills, 0.75% at 550, 1.25% at 600, reaching the 2.5% cap at 750 kills. Edit `yuukaSpawnSettings.maxChance` to change the cap. Successful spawn resets her counter; blocked placements do not reset it. Her kills count throughout boss fights.

Boss charge freezes while any boss is alive and resets on spawning. Current roster is Shiroko + Iroha, so endless waves remain capped at two. Bosses are exempt from ordinary population cleanup. Yuuka bypasses ordinary distance/population trimming so her timed escape rules apply; invalid-map cleanup still applies. Escape awards no kill or loot. Ordinary enemy spawning starts off in Development (`developmentSettings.randomSpawning`). Legal offscreen entrances depend on available playable space; shoreline checks reject water. Enemy AI can cross obstacles; loot and players cannot.

## Maps, sound and visual timings

| Correspondence | Current rule | Config key / source |
| --- | --- | --- |
| Map enlargement | 1.5x; actor size independent | `mapSizeMultiplier` |
| Stage 1 upper movement boundary | Extra70source pixels down, scaled with background height | `officeWindowInsetSource` |
| Stage 1 ordinary variants | Relative weights [30,12,12,12,12,10,6,6] | `officeTileWeights` |
| Stage 1 monument | 3%; forced after 20 outward tiles without one, max 40 across origin | `officeMonument` |
| Stage 2 rare pool | 5%; internal weights [10,5,5,10,35,35] | `palaceRareChance/palaceRareWeights` |
| Stage 2 common groups | Singles total 100, multiples total 130 | `palaceCommonWeights` |
| Stage 2 statue guarantee | Shared Decagrammaton/duo pool, same 20-outward rule | `palaceStatuePityDistance` |
| Stage 3 ordinary variants | Relative weights [25,16,11,8,7,4,10,8,6,5] | `tileWeights` |
| Stage 3 rare shrine/lantern | 1.5% / 3%; at least one in each aligned 20x20 region | `newyearRareSpawns/newyearRegionGuarantee` |
| Track output gain | `masterVolume * mapGain * transitionFade`; map gains .6/1/.6/.6 | `trackVolumeScale` |
| Damage numbers | .55s life, fade after .235s, jump height14.0625px | `damageNumberSettings` |
| Enemy death | .38s life, fade after .12s, recoil48px | `deathSettings` |
| Gacha-ticket death effect | Rise .24s, hold .1s, pop .16s | `gachaSettings` |
| Contact bounce/push | Distances52/14px; recovery .6/.18s | `contactSettings.bounce/push` |

World-generation hash/seed mechanics, source-art hitboxes, sprite animation crop coordinates, HUD artwork coordinates, transition easing and camera movement are implementation details in their named modules. They are not duplicated in this balance file. Use the live settings above for gameplay tuning; use those geometry/animation modules when changing artwork or map alignment.

Rendering priority: map/ordinary enemies, then special enemies, then bosses, then the controlled player and player attack effects. Both special and boss layers bypass foreground map occlusion; Y sorting applies within each layer.

Player visibility behind foreground statues/objects: the covering artwork is composited at50% opacity over the player overlap region (`obstacleVisibility.playerOpacity`). NPC occlusion remains opaque; collision geometry is unchanged.

Enemy combat/contact hitbox radii are multiplied by `combatBalance.enemyHitboxScale` (0.9:10%smaller). Applies to normal, elite, special and boss NPCs, including custom hitbox profiles. Player hitbox, sprite size and map-obstacle geometry are unchanged.

Survival timer: MM:SS fixed at the top center of the screen, 8px below the EXP bar, counting active gameplay time from run start. Pauses with Escape, stops on actual death (invincibility permits continuing at0HP), persists across map/character switches and scene resets; new game reload resets it. New Mob/elite spawns use time-based HP; existing enemies keep their spawn HP. Shiroko/Yuuka/other enemy HP rules remain unchanged. At0/5/10/15minutes basic Mob HP is60/157/253/350, continuing beyond15minutes. Timer scale/offset: `survivalTimerSettings`.

Five active gameplay minutes after completing Stage4/entering endless mode, the boss curve switches to unlock/pity500 and guarantee1500. Total survival time alone cannot activate it. Stage4 completion is the defeat of its complete boss wave; admin map switching does not count. Later endless map changes do not restart this timer. If stored charge already reaches1500 and no boss/wave is active, the next available spawn attempt is guaranteed without another kill. Pausing stops this timer too.

Endless elite formula: `1% + (100%-1%) * clamp((cycleSeconds-300)/(600-300),0,1)`. At5/7.5/10buildup minutes:1%/50.5%/100%. Timer starts on firstStage4completion, pauses with gameplay and is not reset by later map cycles. Only new random Mob variants change; explicit admin Normal/Elite choices still override. Yuuka and bosses never roll elite.


## Elite Surge event (current endless event)

- With random spawning running and no boss alive: normal for5minutes, ramp over the next5minutes to100%eliteMobs and10arrivals/sec.
- Hold100%eliteMobs/10arrivals persecond for3minutes (`endlessEliteSettings.constantEliteSeconds`).
- Defeat every active elite through the ordinary kill/reward/death-effect system, then request the existing unique boss wave. Normal enemies and special enemies are not cleared.
- Spawn rate returns to the ordinary adaptive5-8/s (including crowded slowdown), and randomMobelite chance returns to1%.
- While bosses live, buildup is reset. After the wave dies, the next cycle starts from its normal phase.
- Globalpause or stopping randomspawns freezes buildup progress. Map switches do not reset an active cycle.
- Endless automatic kill-pity waves wait for this cycle's completion; normal stagebosscharge rules remain in use before endless. Manualboss spawns can interrupt/reset buildup.
- Config: `endlessEliteSettings.rampStartSeconds/rampEndSeconds/targetChance/constantEliteSeconds/maxSpawnRate`. Controller: `endless-buildup.js`.

Elite Surge is registered in `endless-events.js`; `endlessEventSettings.enabledEvents` selects the implemented event pool. It is currently the only event, so the existing timing remains. A new event is selected after a boss wave ends. An empty event pool restores ordinary kill-pity boss spawning without elite-event overrides. Future event definitions must implement the same controller contract; no unspecified event behaviors have been added.


## Boss-driven stage progression

Campaign: Stage1 (Shiroko) -> Stage2 -> Stage3 -> Stage4. Each transition occurs automatically after the last living/queued boss in the wave is defeated. Clearing Stage4 starts endless mode and its timers. In endless, every completed boss wave chooses another available stage at random; it avoids repeating the current stage. Each endless clear has a10%secret roll (`stageProgressionSettings.secretChance`), but the missing secret map is never loaded: until implemented, that roll falls back to an existing regular stage. Admin map switching remains available for previews and does not by itself complete Stage4. Existing background-only ripple, map audio switching, positions and map-change cleanup are reused. Transitions wait for an ongoing ripple to finish instead of being dropped.

Enemy contact scaling uses current player level and total active survival time at the moment of contact. NormalMob base1 atlevel12/8minutes dealsfloor(1+(12/6)*(8/4))=5damage; elite base multiplier2 deals10. Atlevel6/4minutes normalMob deals2. All final damage rounds down; no intermediate rounding. Shield absorption, globalIframes andYuuka3second hit cooldown apply afterward as before.


## Drawing weapon skills

| Rule | Value | Editable setting |
| --- | --- | --- |
| Drawing window | 5 seconds | `skillCastSettings.drawingSeconds` |
| Early finish | 1.5 seconds without a new stroke after drawing | `idleSubmitSeconds` |
| Right-click cancellation | 30-second cooldown on the casting weapon | `rightCancelCooldown` |
| Pause cancellation | 60-second cooldown on the casting weapon | `pauseCancelCooldown` |
| Successful recognized cast | 180-second weapon cooldown | `successCooldown` |
| Minimum drawn length | 12 canvas pixels; blank/tiny input gives no cast | `minimumInkLength` |
| Recognition confidence gate | 0 initially: accept the model's top label for this prototype | `minimumConfidence` |
| Model | Xenova/quickdraw-mobilevit-small, quantized WASM in a Web Worker | `model` |
| Visible ink | 5px rounded cyan/blue/lilac gradient with glow | `lineWidth` |
| Model raster | Cropped/centered256px square with24px padding and16px strokes, converted to1channel/inverted for QuickDraw28px preprocessing | `modelInputSize/modelPadding/modelLineWidth` |
| Cooldown sweep | Cleared clockwise angle = `360 * (1 - remaining/duration)` degrees | HUD cooldown circle |

Right-click the game arena to begin using the selected equipped attack (first equipped attack by default); click another occupied attack slot to select it. The screen dims50% and targeting temporarily uses facing direction, then restores the prior cursor-aim preference when the drawing window closes. Multiple strokes are supported. Holding left-click keeps drawing; releasing starts the3second idle timer, and starting another stroke resets it. The8second total deadline always wins. World simulation and ordinary attacks continue.

Timeout/idle closes the drawing overlay and sends only the cropped sketch to the browser worker. Model files download from HuggingFace/CDN on first use and are browser-cached; drawing inference is local, without a remote inference endpoint. Failed recognition, errors and blank drawings automatically start the3minute failure cooldown. Right-click/pause may also cancel pending recognition; token checking ignores late results. Cooldowns belong to individual equipped weapon objects, pause with gameplay and persist when switching avatars. Context changes/resize cancel without a penalty. A `skill-drawing-recognized` window event exposes `{player, weapon, predictions}`; the weapon also stores `lastSkillDrawing`. Plana Umbrella Launch is now mapped to the circle/upper-arrow/lower-X composite. Other patterns are rejected and start the failure cooldown. Three separated component crops are classified by QuickDraw; explicit spatial/stroke geometry validates the complete symbol.

Verification: `node Development/tests/skill-casting.test.cjs`. Browser-only isolated fixture: `Development/tests/skill-preview.html` served over localhost. It does not load Firebase or the authenticated game page; it uses isolated enemy records to test the projectile. The model smoke-test button classifies a generated circle and prints actual predictions; recognition labels can differ from the intended sketch. Live drawing, idle submission,30sright-click/60spause penalties and180ssuccess cooldown were exercised in browser.


## Plana: Umbrella Launch

Pattern: an outer circle enclosing an arrow above an X. Circle may use multiple arc strokes; symbols can be drawn in any order. `plana-pattern.js` separates components and checks circle coverage/roundness, diagonal-line crossing for X, arrow shaft/head geometry, containment and vertical layout. QuickDraw receives separate circle/X/arrow raster crops. Its published classes include circle but no literal X or arrow, so geometry supplies those missing semantic checks; AI predictions are retained per component. CLIP additionally classifies the complete symbol against explicit missing/reversed/scribble alternatives. A complete geometric pattern succeeds independently of model confidence; a rough geometric failure can be rescued by CLIP when the complete symbol ranks first with score >=0.25, reference accuracy >=0.35, and interior ink in both symbol regions. Invalid patterns automatically start the failure cooldown. Existing right-click/pause cancellation penalties remain.

Effect settings in `planaSkillSettings`: open umbrella over0.22s using eight measured source-sheet poses; fly forward at900px/s up to800px with80px hit radius. Swept capsule checks prevent skipping enemies between frames. Each enemy can be hit once/projectile: `round(umbrellaBaseDamage * 1.5 * ATKMultiplier * criticalMultiplier)` (35damage at23base without bonuses/crit). Surviving targets are pushed sideways180px plus45px forward over0.22s, and stunned3seconds. Bosses/specials are included. Stun suppresses AI, attacks and contact damage, with movement constrained by existing map limits. World pause freezes flight/stun. Map/scene resets remove active projectiles. Launch follows directional facing captured at drawing submission. Successful pattern recognition retains180s weapon cooldown.

Regression: `node Development/tests/plana-skill.test.cjs`; browser fixture adds RunPlanaPatternTest and LaunchUmbrellaDemo. Source crops reference `sprites/attacks/plana umbrella.png`, original asset unchanged.


### EX Skill drawing accuracy and CLIP

QuickDraw classifies isolated components; `Xenova/clip-vit-base-patch32` classifies the complete sketch locally in the same browser worker. CLIP uses normal black-on-white RGB input; only QuickDraw is converted to grayscale and inverted. Model loading is lazy and cached. Failed CLIP loading leaves the geometric/QuickDraw route available. CLIP confidence is relative to its candidate labels, not a calibrated probability of correctness.

Reference accuracy compares uniformly sampled normalized ink to the EX Skills diagram in both directions, ignoring translation, overall size, pen speed, stroke order and stroke direction. It preserves relative placement and orientation. `accuracy = clamp(1 - symmetricMeanNearestInkDistance / 0.12, 0, 1)`. This is a geometric likeness score, separate from model confidence.

Successful skill damage is `round(baseWeaponDamage * accuracyMultiplier * ATKMultiplier * criticalMultiplier)` using existing attack damage handling. The accuracy multiplier interpolates linearly through `(accuracyMinimum=0.35, damageMinimum=1.2)`, `(accuracyAverage=0.65, damageAverage=1.5)`, `(accuracyPerfect=0.95, damageMaximum=2)`, clamped to 1.2?2. These are tuning anchors; actual average drawing accuracy depends on players. For Plana base23 damage before ATK/crit: minimum28, typical35, maximum46. Unsuccessful casts launch nothing and automatically receive the failure cooldown (180seconds by default).

Edit the model IDs, acceptance thresholds, accuracy anchors and damage multipliers in `skillCastSettings` in `game-config.js`. Circle/arrow/X geometry tolerances remain in `planaSkillSettings`. `planaSkillSettings.damageMultiplier` has been replaced by accuracy-based `skillCastSettings.damageMinimum/damageAverage/damageMaximum`. Cast feedback and `weapon.lastSkillDrawing` include accuracy/multiplier; the pause reference shows the damage range. Stun remains3seconds, successful cooldown180seconds.

Sources: https://huggingface.co/Xenova/clip-vit-base-patch32 and https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ZeroShotImageClassificationPipeline


Umbrella launch presentation: `openingSeconds=0.28` with smooth fade-in, then `prelaunchSeconds=0.08` holding fully open before flight. `projectileSpeed=3600px/s` (previously900), `displayLength=128px` (20% reduction from160). Blurred open-pose afterimages sample every10px, at most96 per projectile, live0.20s with5px blur; a soft continuous cyan streak joins the trail. The trail fades after the projectile reaches its range; expired effects are removed. Range800, hit radius80, stun3s and accuracy-based damage remain unchanged. All launch/tail settings are in `planaSkillSettings`.


### Midori invasion event

After an Elite Surge finishes, its elite army is defeated as usual. `endlessEventSettings.midoriAfterEliteChance=0.5` chooses a Midori invasion instead of requesting a boss wave. The invasion lasts `midoriSettings.eventSeconds=180` active spawning seconds, then ordinary spawning resumes and the event cycle restarts. These initial chance/duration defaults are editable. Automatic encounters remain after Stage4; admin shortcuts can trigger either event on any stage. No automatic boss wave is allowed during a Midori invasion. While active, every automatic arrival is Midori; the Yuuka roll and normal Mob/elite choice are bypassed.

Midori movement speed = controlled player's current movement speed (including SPD%) * `midoriSettings.speedRatio=0.81225`. At base player240px/s, Midori194.94px/s. Recalculated each frame so speed upgrades/character changes are respected. Midori HP = time-scaled basic Mob HP * `combatBalance.eliteHpMultiplier` (currently10); contact damage follows elite2x multiplier and the existing level/time damage formula. Midori uses normal character size, special render priority, elite drops and a GIF animation. Admin seed0 continues overriding HP to1.

Player weapon attacks against Midori within `midoriSettings.closeRange=160px` roll `midoriSettings.missChance=0.05` once per attack/enemy. A miss shows MISS, deals no damage, causes no damage flash, and applies no EX stun/knockback. Distant hits and admin/scripted cleanup damage do not roll evasion. Existing successful attack damage formulas are unchanged.

Admin controls: right-hand Playtesting > Event testing > Start elite wave / Start Midori invasion / Stop event. Starting enables random spawning and bypasses the wait; stop pauses random spawning and resets the event cycle, retaining existing enemies. Active or pending boss waves must be removed/defeated before triggering an event. Midori is also available in NPC sprite selection for individual manual spawning.


### Special animation playback and running spawn lanes

Yuuka/Midori GIF elapsed time advances by `deltaSeconds * 1000 * specialEnemyAnimationSettings[type]`, currently3 for each (3x source playback speed). This affects animation only, not movement speed, GIF source timing or encounter rarity.

Automatic stream arrivals while the player is actually moving reserve at most `playtestSpawnSettings.forwardPerSecond=3` successful forward-edge arrivals per rolling second. Overflow uses the perpendicular axis, balanced/ranked by the existing entrance logic. Horizontal running: ahead plus top/bottom. Vertical running: ahead plus left/right. Diagonals use the dominant movement axis (ties useX). Only legal offscreen entrances are used. When perpendicular entrances are unavailable, overflow uses the rear edge; if only the forward edge exists, arrivals are throttled to the forward cap. Stationary players retain ordinary entrance distribution. Total adaptive/event spawning rates and population caps still apply. Boss-wave placement is separate from this ordinary/event stream.


Midori chase target compensates for her foot-hitbox offset: target sprite anchor = player combat center - (Midori foot center - Midori sprite anchor). This aligns the small foot ellipse to the player instead of stopping when sprite anchors overlap. Speed reduced another5%:0.855*0.95=0.81225 of current player speed.

### Weighted visible population

`visibleSlots = sum(visibleEnemy.elite ? playtestSpawnSettings.eliteVisibleSlots : 1)`, with eliteVisibleSlots=3. At50slots, ordinary/event arrivals slow to2/s. The sidebar shows slot usage separately from actual enemy count. Midori has elite stats/identity and therefore also consumes3slots. Offscreen enemies consume no visible slots. The global400population cap and its cleanup still use individual enemy counts.


Failed cast cooldown: `skillCastSettings.failureCooldown=180seconds`, applied automatically on invalid recognition, recognition errors, and empty/insufficient-ink timeout. Failure returns the state to idle, restores aiming and closes the overlay without another right-click. Success remains180s; explicit right-click cancellation30s and pause cancellation60s remain. Weapon cooldown circle diameter reduced2px by adding1px inset per side.


Casting size/aspect independence: input is normalized independently alongX/Y into a200x200shape box before geometric parsing, model raster generation and reference-accuracy scoring. Translation, uniform size and overall squashed/stretched proportions therefore do not change acceptance or the damage multiplier. Removed48px minimum and aspect-ratio rejection; minimumInkLength=0 rejects only empty ink before normalized shape checks. Order remains flexible, including circle then arrow thenX. Relative symbol placement/completeness still matters. Raw ink rendering remains at the drawn screen location. Degenerate zero-width/height scribbles cannot form this pattern.

Skill availability: `readySkill(player)` prefers the selected ready attack, then another equipped ready attack, then optional `player.ultimateSkill`. Right-click opens casting when any skill is ready; blocked only if no skill is equipped or every equipped skill is cooling. Each weapon/ultimate stores its own remaining/duration. Cooldowns tick once per unique skill object per frame. The optional ultimate contract is supported for future content; no ultimate effect/pattern is defined yet.

EX selection correction: weapon slots are display-only; all equipped autoattacks remain active. Readiness is independent of selectedSkillSlot. The drawing is matched against ready equipped skills, with only the matched weapon receiving successful cooldown. There is no weapon switching. Future ultimate can participate through ultimateSkill when defined. Existing failure/cancel penalties attach to the first ready skill at drawing start if no pattern matches.

Admin EX testing: `admin-skills.js` maps digits1-6 to attackSlots0-5 and defined EX IDs. UI buttons Reset cooldowns / Cast1-6 and a Draw numbers1-6 toggle are left of the simulated screen. Number mode bypasses readiness cooldown checks and classifies digits with local normalized ink templates, then uses the existing skill effect and normal typical-damage anchor; no weapon selection or model request is involved. Normal play retains pattern validation/readiness. Currently only plana-umbrella has an implemented EX. Undefined slots reject rather than casting an invented effect. Reset clears all character skill cooldowns (including optional future ultimate) and invalidates pending recognition.

Latest umbrella presentation: displayLength115.2px, projectileSpeed2520px/s (fixed, unaffected by SPD/Haste). EX opening/projectile/trail render behind the player. Hit radius, range and damage unchanged.

Umbrella EX knockbackDistance now72px (60% reduction from180); forward component18px. Stun3s and knockback travel0.22s unchanged.


Event end cleanup: each automatic arrival during an event carries its unique eventKey. End event (no drops) and natural event completion call endEventEnemies for that key, creating normal white/recoil/fade death remnants then removing living records. No reports, credits, notes, kills or defeat listeners are emitted; unrelated enemies/bosses are retained. Elite-to-boss/Midori transitions use this cleanup instead of rewarded scripted kills. Stop event also cleans its encounter and pauses spawning; End event leaves the stream running at ordinary rates. Crowded spawning is now2/s.

Latest combat geometry: enemyHitboxScale=0.81 (0.9*0.9). Player circle radius=profile.rx*spriteSize; center=(character.x,character.y), vertical radius equals horizontal. Enemy ellipses/foot anchoring retain their profiles with reduced radii.

### Level-up choices and umbrella awakening

Each level gained heals HP to max and adds1pendingUpgrades. Pending choices pause the world, timers, combat, spawning and skill cooldowns; overflow XP can queue multiple choices. The reference-style menu shows live character stats and4positions; only Plana Umbrella's next level is available, so3positions remain empty. No equipped/eligible weapon upgrade yields Continue rather than fake stat upgrades.

Umbrella upgrade table:

| Level | Effect |
| --- | --- |
| 1 | Existing forward umbrella arc autoattack |
| 2 | +30%base damage |
| 3 | +20%attack area |
| 4 | Multiply attack interval by0.9 |
| 5 | Additional+30%base damage |
| 6 | Additional+20%attack area |
| 7 | Guaranteed critical hits with3x critical multiplier |

Damage multiplier=`1 + 0.3*(L>=2) + 0.3*(L>=5)`. Attack-area multiplier=`1 + 0.2*(L>=3) + 0.2*(L>=6)`; linear reach/art scale=sqrt(area multiplier). Interval=`baseInterval * (L>=4 ? 0.9 : 1) / HasteMultiplier`. Normal damage uses existing player ATK/crit handling until7; level7damage=`round(baseWeaponDamage * weaponDamageMultiplier * ATKMultiplier * 3)` and always crits. EX damage uses its drawing accuracy multiplier in addition to weapon damage/crit upgrades; fixed EX speed remains2520px/s.

Awakening: separate upgrade after reaching7, spends1SecretTechNote and setsweapon.awakened=true without exceeding7. Only offered when a pending level-up choice and collected note are available. Adds gold silhouette outline/sparkles on HUD weapon icon and gold autoattack glow; no additional stat effect specified. `umbrellaUpgradeSettings` holds live tuning. Collected notes are shared across avatar swaps and spending is checked atomically. No other weapon upgrade added.

### Aris laser autoattack

Live settings: arisWeaponSettings. Base weapon damage=`randomUniform(9,11)*3`, rounded through existing ATK/crit pipeline =>27–33 at0%ATK/no crit. Level4multiplies weapon damage by1.5; Umbrella's level7critical guarantee does not affect Aris. Player CRIT still applies normally.

Interval=`(3 - 0.5*(L>=3) - 0.5*(L>=5))/HasteMultiplier` seconds. Active beam duration1second (confirmed by user), unlimited piercing, per-enemy hit cooldown1second shared across this weapon's concurrent volleys. Size multiplier=`1 + 0.3*(L>=2) + 0.5*(L>=6)`; multiplies32px base width. Range2000worldpx is independently editable. Level7fires forward and rear beam per volley. Position follows player during active beam; aim remains captured at firing.

Knockback duration10/60seconds, speed15*60=900px/s (source15px/frame at60Hz), total150px. Damage applies once per eligible target/hit cooldown, with existing Midori evasion; missed hits do not knock back. Cooldown/beam pause with gameplay. New-weapon acquisition uses first free attack slot, supports six slots, and no weapon switching. Max level7 and separate post-max1SecretTechNote awakening; Aris has no defined EX pattern yet and is excluded from skill readiness. Upgrade icons now support full artwork as well as cropped/rotated sheets.

### Latest Plana umbrella base stats

Nominal damage120%of10=12; starting roll10–14 through rollUmbrellaBaseDamage, then weapon-level bonuses, ATK and crit. Settings damage=10,damageMultiplier=1.2,damageMin=10,damageMax=14; variation scales with nominal tuning. Interval1.5s (90/60),attackCount1,unlimitedhitlimit,hitCooldown0.5s (30/60) perenemy shared across autoattack swings. Base area100%preserves existing190degreearc/baseRadius64/reach176. Swing animation0.2s unchanged. LV4interval=1.5*0.9=1.35sbeforeHaste. Level7defaultnominalcritical=round(12*1.6*3)=58beforeATK. EX uses sampled10–14base*accuracyMultiplier*weaponLevelDamage/crit; fixed speed unaffected.

### Knockback collision and resistance

Living knockback displacement=`direction * baseSpeed * (ignoreResistance ? 1 : 1-R) * duration`. Existing vector-defined effects derive baseSpeed=vectorLength/duration and now advance linearly instead of easing. First hit uses existing resistance (default0); afterwards bonusResistance increases0.1 for subsequent hits. `R=clamp(baseKnockbackResistance+bonusResistance,0,0.9)`. Every new valid knockback resets idle timer. At10active gameplay seconds without a knockback, bonusResistance resets0; configured base resistance remains. Pausing freezes timer.

Absolute `enemy.knockbackImmune=true` rejects displacement even when attack `ignoreKnockbackResistance=true`; independent stun remains. No existing variation is arbitrarily made immune; flags support future variations. PlanaEX/Aris settings expose ignoreKnockbackResistance=false by default. Contacts also gain/apply resistance.

Movement is swept against other living enemy combat bodies and sampled against scene obstacle/shore/boundary footprints in <=4px steps (smaller for tiny bodies). Collision stops both actors' current knockback; scenery stops the moving actor, without slope sliding. Separate stun/contact recovery timers are preserved. Normal AI movement retains obstacle bypass. Cosmetic combat-death launch is separate; event-end deaths retain in-place fade. Parameters in knockbackSettings.

Shared damage procedure (current; supersedes earlier weapon-specific random rolls)
-------------------------------------------------------------------------------
Edit damageRules and attackDamageFormula in game-config.js.
Weapon damage is a factor: 120% = 1.2, 300% = 3. Total ATK includes the starting 100% plus ATK bonuses.
base = 10 * totalWeaponDamage * totalATKPercent / 100
variance = base > 2 ? max(base * 0.1, 2) : 0
randomized = base - variance + randomUniform(0, 2 * variance)
finalDamage = round(randomized * damageMod)
Damage modifiers include critical multipliers and EX drawing accuracy, applied after randomization. Weapon level damage bonuses are included in totalWeaponDamage before ATK/randomization. Round only the final result.
Examples at starting ATK: Umbrella 12 base gives 10-14; Aris 30 base gives 27-33. Umbrella with +100% ATK has 24 base and a 21.6-26.4 range before rounding. Damage <= 2 is not randomized.
The supplied random expression was incomplete and asymmetric; implementation follows the explicitly requested symmetric +/-2 or +/-10% range.

Weapon damage and Growth (current; supersedes additive weapon damage level bonuses)
---------------------------------------------------------------------------------
weaponDamage = baseWeaponFactor * product(1 + eachApplicableBonusPercent / 100)
Growth rank: character.growthRank (default0, capped3). Reserved purchase costs500/10000/50000; total60500. No shop/enhancement/mod/enchantment implementation yet.
Growth nominal damage = 0.1 * rank * playerLevel / primaryProjectileCount * tickMultiplier
Growth factor = Growth nominal damage / 10
Tick multiplier = clamp(hitCooldownFrames / 20, 0.2, 1). Seconds are converted to60Hz frames by each weapon.
totalWeaponDamage = weaponDamage + Growth factor
This enters the existing shared ATK/randomization/modifier pipeline. Growth is not multiplied by weapon level/base damage bonuses, but does scale with ATK and critical/EX accuracy modifiers.
Eligibility: character.mainWeaponId, defaulting to Plana's umbrella for Plana. Its EX inherits this eligibility. Aris defaults to a secondary weapon; setting mainWeaponId to aris-laser enables Growth. Its MAX forward/rear primary beams split the bonus in two. Secondary/on-hit effects must not be included in primaryProjectileCount.
Umbrella damage upgrades now multiply: 1.3 * 1.3 = 1.69 at LV5+, instead of1.6. The sample0.02*level term represents rank2; the rank-based description is authoritative. Future enhancements are deferred, including their blacksmith bonus.
Edit growthSettings and weaponDamageFormula in game-config.js. Applicable weapon-only character bonuses can be supplied as additional percentages to totalWeaponDamage without applying them to Growth.

Growth status: future upgrade only. Keep default rank0 and defer further implementation/purchase controls until explicitly requested.

Current stat rules: normal crit multiplier1.5 (Umbrella LV7 override3). Pickup = character starting radius +0.4*PUR%; generic default40, existing Plana99/Arona0 overrides preserved. Haste interval = max(1,round(baseSeconds*60/(1+haste%/100)))/60; only repeat interval changes, not hit cooldown/duration/delay. See NOTES.md for stat definitions and deferred sources.

ATK: totalATKFormula(baseATK, bonuses) = baseATK + sum(bonuses). Default base from attackStatSettings.baseATK=100; character.baseATK overrides it. combatStats.atkPercent holds accumulated bonus percentage points, excluding base. Both shared damage rolls and ATK statMultiplier use totalCharacterATK/100.

Critical modifier: totalCritModFormula(baseCritMod,bonuses)=baseCritMod+sum(bonuses); multiplier=1+totalCritMod/100. Default base+50% derives from combatBalance.criticalMultiplier1.5; character.baseCritMod overrides base. combatStats.critDamagePercent stores additive bonuses, separate from critPercent chance. rollAttackDamage weaponCritDamagePercent applies weapon-only additions; explicit weapon criticalMultiplier replaces base only, retaining additive bonuses.

Bonus damage taken: bonusDamageTakenFormula(bonuses)=1+sum(bonuses)/100. Enemy target bonusDamageTakenPercent array supplies additive debuff percentages to shared rollAttackDamage. Applied before final rounding to current weapon/EX hits; empty defaults1. No active debuff system yet.

Damage Bonus: damageBonusFormula(multipliers)=1+sum(multiplier-1). character.combatStats.damageBonusMultipliers defaults to independent[]. Separate attacker multiplier from target bonusDamageTakenPercent debuffs; both apply before final rounding. Example1.2x+1.3x sources=>1.5x DB.

Damage reduction: damageReductionFormula(reductions)=product(1-clamp(reduction,0,100)/100). target.damageReductionPercent array. Empty1x;20%and20%=>0.64x. Enemy shared weapon/EX rolls apply before final rounding; player reception rounds reduced damage before shield/HP. Independent from additive DB and target vulnerability.

Halo: haloDamageFormula(distance,level). Unequippedlevel0=>1x;distance<130=>0.9x;distance>=130=>[1.2,1.4,1.6]byLV1-3. character.haloLevel activates. Shared hit rolls measure current character-to-target world distance and multiply before final rounding, independently from other modifiers. Edit haloSettings.

Combined damageMod = (criticalHit?1+totalCritMod/100:1) * bonusDamageTaken * DB * DR * Halo. damageModifiersFormula composes aggregated categories, plus attackModifier for EX accuracy; defaults1. Shared rollAttackDamage applies this once before final rounding. Categories stack according to their own rules; DR remains multiplicative internally.

Special-enemy spawn-time profiles: specialEnemyStatsFormula(type,elapsedSeconds), opt-in shooter/bomber/bomber-boss. Uses minute/second components (hour wrap), returns atk/spd/hp/expValue; bomber-boss includes instantKOImmune intent. See NOTES.md for all supplied equations and behavior. Existing enemy stats not reassigned; SPD factor conversion and attack/loot integration pending.

Enemy scaling equations now supplied: a=max(0,minuteComponent-23)+37*hours; b=max(0,totalFullMinutes-30)+60*max(0,hours-1). ATK=(baseATK+2a)^(1+b/25); SPD=min(300,(baseSPD+0.12a)^(1+b/25)); HP=(baseHP* (1+0.05a))^(1+b/50). Helpers enemyTimeScalingFormula/enemyStatsScalingFormula. Optional campaign clock adapter reference23min+endless time,0preendless. Base-stat pool assignments/live migration pending; do not stack with existing scaling.

Score: StageMode(stages1-4) calculates on stage completion; Endless(afterStage4) calculates on defeat. Highest scores grouped by character in future leaderboard. Equation/weights/aggregation and placement pending; no live scoring or persistence yet. See NOTES.md.

Score formula now available: scoreFormula({enemyDefeated,miniBossDefeated,bossDefeated,playerLevel,elapsedSeconds,hardcore}) returns baseScore/hardcoreBonus/finalScore; weights in scoreSettings. Uses exact supplied timer components (minute0-59, not cumulative); Hardcore bonus floors separately. See NOTES.md for full formula and integration status.

Current EXP override: LV1requires79;later roundEven((4*(L+1))^2.1)-roundEven((4*L)^2.1). Supernova(aris-laser) auto0.3s,EX3saimable;EX0.5sper-targettick provisional,shared damage+accuracy. See NOTES for pattern and pending harmless enemy redesign.

Current audit: Score counters/snapshots now live (Score testing dropdown); Yuuka/Sensei harmless stats/lifetime/escape implemented, Yuuka30% at180/540/1020seconds. Sensei manual only until timestamps defined. Credit1perhit retained, caps unassigned. Refer to NOTES current implementation status; earlier pending integration notes superseded where noted.

Supernova EX update:per-targethitCooldown0.2seconds. Sideways nearest-edge ejection includes halfbeamwidth+projectedbodyradius+32pxclearance minus currentoffset; forward36px,travel0.2s. Uses existing resistance/immunity/collision solver. Autoattack hitcooldown/knockback unchanged. supersedes earlier EX0.5stick.

Harmless hit-count defeat: receivedHits increments once per accepted positive hit; required threshold from enemy.hitsToDefeat or harmlessEnemySettings.<type>HitsToDefeat. At threshold forceHP0and use ordinarydeath/loot/kill pipeline,zeroEXP. Thresholds null pendingusernumbers.25secondtimeoutescape remains.

Harmless minimum hits: max(1,ceil((normalAttackDamage/2)*((totalElapsedSeconds/60)/2))). Snapshot on Yuuka/Sensei spawn; fractional total minutes count. Defaults shared, optional fixed pertype testoverrides remain. Inspector showscurrent/requiredhits. See harmlessHitsToDefeatFormula.

Current harmless hits override:harmlessHitsToDefeatFormula(playerLevel)=max(1,floor(playerLevel)). Yuuka/Sensei snapshotplayerlevelatspawn;supersedesdamage/timeformula. Optionalfixedtestoverridesremain.

Supernova presentation:arisBeamVisualSettings durationMultiplier1.2=>auto0.36svisual/0.3sactive,EX3.6svisual/3sactive. EXstartup0.28sfade+0.08shold before firing. Roundedcone,16pxouterblur/5pxinnerblur/softcore,origin108px. Subtle5.5%9Hzvisualpulsesdonotaltergameplay. Existing0.2sEXticksremain.

Supernova bloom presentation:twoadditiveblue/cyanlayers;arisBeamVisualSettings bloomBlur30,bloomSpread3.4,bloomOpacity.32. No gameplay changes.

Supernova weapon latest:length105.6(+20%);opening0.336s(+20%duration),hold0.08;emergesbehindplayer,heldthroughbeamvisuals,then0.28sfade/retractiontocenter. Sharedphasefinishincludesweaponreturn;damagewindowunchanged.

Enemy base table added:enemyLevelPresets1-5,enemyLevelPreset(level) returnsindependentcopy. Exact HP/ATK/SPD/EXPvaluesfromusertable;LV3knockbackImmune=true. Assignmenttoenemies/stagespendingclarification. BasekeyscompatiblewithenemyStatsScalingFormula;SPDconversion/rewardpolicy notinferred.

Stage table nowactive:enemyStageLevelFormula mapfirst..fourth=>1..4,endless=>5. stageEnemyStats applies reference scaling with endless adapter,notlegacy MobHP/contactscaling. RegularMob/Sweepers updated atspawn/stagechange/fullendlessminutes,HPfractionpreserved,admin1HPbaseline synchronized. SPDfactor*baseplayer240;EXPstagevalues. Boss/specialrulesunchanged.

LATEST:stage-wideenemyvaluesBENCHED. Table/helpersretainedasreferencesonly;liveNPCspawn/minuteupdatesdisconnected. Per-enemytemplate/enemyVariantHP/speed/contact/EXPrulesrestored;nostage3blanketimmunity. Priorstageactiveintegrationnotes superseded.

ActiveMobprofile:enemyTypeStats.mob={HP8,ATK2,SPD.35,EXP6,spawnStart0,spawnEnd180exclusive}. SPD*.baseplayer240=>84px/s. chooseStandardEnemy filtersMobafter180seconds;manualspawnsbypass. Per-type contact avoidslegacydouble-scaling;otherenemyrulesunchanged.

Sweepers:whiteSweeper/heavySweeper HP40,ATK4,SPD.4=>96px/s,EXP7,automatic30<=seconds<300. Independenteditableprofiles;manualbypassandadmin1HPpreserved. Noeligiblefallbackafterallwindowsend.

MegaMob:enemyTypeStats.megaMob600HP/6ATK/.5SPD=>120px/s/150EXP/spawnAt120s. createMiniBossSchedule retriesblockedplacementsuntilsuccessfulthenconsumesonce. Mini-boss identity supportsKOimmunity/score,notfullbossprogression. Size2xMobvia megaMobSettings.

Mega=formerelitecategory. Mobelite routes usemegaMobprofile600HP/6ATK/.5SPD/150EXP,miniBoss=true,noextraHP/ATKmultipliers. ScheduledMegaMobsizeuseseliteSizeMultiplier1.98. Internaleliteflagkeeps3slotcost/odds/loot;miniBossEXPbypassgenericelitecap. OtherMegavariantsretainpreviousstatbonusespendingprofiles.

HeavySweepercurrent:80HP/4ATK/.4SPD=>96px/s/8EXP;automatic180<=seconds<300. WhiteSweeperunchanged40/4/.4/7,30<=seconds<300. Supersedes earlier identicalprofiles.

Shirokofirstboss:8000HP/15ATK/.8SPD=>192px/s/2000fixedEXP,Stage1automaticat300s replacingkillcharge. First-stagechargeblocked;manualrequestallowed;laterbossrulesunchanged. FixedEXPsplitexistingfullcirclebossburst>=50reports.

Supernova:autoattackcooldownfrozenwhileEXcontrolleractive(opening/beam/tail/return);existingautovolleyclearedoncast;remainingtimerresumesafterward. Iconrotation45degrees. Otherweaponattacksunchanged.

CurrentSupernovaEXpattern:crown3-5spikesbelowinvertedbulletonly;nosidelines. Bestaccuracyamong3/4/5references,sharedaccuracy-damagepipeline. Pauseguideupdated;oldflankinglinerequirementsuperseded.

CurrentSupernovapattern:3spikes/openunderside(nohorizontalbase)+invertedbullet,nosides. Allreadyskillsrankedbyreferenceaccuracyinsteadfirstmatch. Closestweaponreceivesfailurecooldownratherthaninitialslot. Earlier3-5/closedcrownnotes superseded.

Sweepersizecurrent:sweeperSettings.sizeRatio=.75=>67.2pxvsMob89.6px;25%smaller. Sharedhitboxscalesproportionally.

Supernovapatterncurrent:open-bottom3pointcrown+diamondabove. Replacesinvertedbullet;nosidelinesorbottomstroke. Reference/guide/routingaccuracyupdated.

LatestSupernovastart:actualplayercollidercenter+aimrayradius+10pxgap;arisBeamAnchor/arisBeamOffset sharedvisual/collision/weaponmuzzle. ReplacesfixedoriginOffset. SweeperssizeRatio.6 (previous.75*.8),53.76px;proportionalhitboxes.

Umbrellavisual:unblurredfullsweptannularsector+roundedcyancoreafterblurcomposite;sharedendpointscoverfullconfigured190deg. Blueafterimageaccent. Gameplay unchanged.

Umbrella blur current:originalumbrella-spriteafterimagesonly,fulltravelledangularrange;artificialblue/pinkarcstrokesandcyansectorremoved. Naturalartcolorsretained. Gameplayunchanged.

Castingcancelcurrent:blankrightclick/pause/timeoutnocooldown. InkusesclosestDrawingSkilllocalreferenceforpenaltytarget,notdefaultslot;unmatchednocooldown. Existingright30s/pause60spenaltiesremainforselectedinktarget.

Latestrecognitionfailure:anyunknown/ambiguous/AIerrorresultnocooldown;success180sunmodified. failureCooldown0,matchMinimumMargin.06rejectsambiguousbestmatches. Explicitinvalidflagoverridesscore/label;nocooldownonguessedweapon.

Invisibleclose-rangecoverage:Umbrella.damageInnerRadius0vsvisualbaseRadius64;Supernova collisionorigin=playercollidercenter,visualoriginstillradius+10px. Direction/outerrange/hitcooldowns unchanged.

MegaSweepercurrent:1800HP/10ATK/.75SPD=>180px/s/600EXP,spawnAt240once. Sharesmini-bossscheduler/adminselector. FormereliteSweeperroutesuseprofilewithout10x/2xrestacking;600EXPexact. WhiteSweeperartscaledoldelitefactor.

Timedformation:timedEnemyEvents opening-mob-cluster at5s,15Mob,cluster,defaultstats,lifetime null. createTimedEnemyEvents compactgrid onvalid offscreenside,normalchase;capacity/placementretrywithoutduplicates. Requiresautomaticspawningenabled;periodicspawnstreamcontinues.

01:05timedevent:sweeper-horde-0105,whiteSweeper,horde,count30,defaultstats,lifetimenull. Fixedspawnheadingtoinitialplayerposition,noretarget/speedoverride. Timedarrivalsprotectedfromdistancecleanupuntilfirstviewportentry;normalcleanupafterward.

01:30wall:eventheavy-sweeper-wall-0130,count140(70/oppositewall),HeavySweeperHP120/ATKdefault4/SPDdefault.4/EXP4,lifetime8s=>expiry98s. EventspawnignoresordinaryHeavywindow. SurvivorsendEventEnemiesfade/noKB/loot/kills;combatkillsrewardnormally. Nomorelateplacementsafterexpiry.

02:35Sweeperring:sweeper-ring-0235,whiteSweeper,count50,defaultstats,radius240(reducedtofitplayablebounds),lifetime8=>expiry163seconds. Fullringaroundplayerthenchase. Event-endnoKB/loot/kills.

02:45Mobstampede:10,HP500,ATK2xdefault=4,SPD2xdefault=.7=>168px/s,EXP8,lifetime20=>185s. Straightperpendicularline/lockedheading;0.8sentryarrowwarning. NoMega/conflatedmodifiers;expiryusesnorewardeventcleanup.

LATEST:allautomatic event triggersbenchedviaeventTriggerSettings.enabled=false. Priorchartdefinitionsretained,notactivated. Includesformations,mini-boss/harmlessschedule,automaticbosswaves,endlessbuildup. Ordinaryspawnstreamandmanualadmintestsremain. Pendingfullreplacementchart.

Stageassetroster:enemyStagePools firstMob/Mob2/Mob3;secondWhite/Heavy/OPS;thirdArius1-3;fourthHighlander1-3(correctedcount). enemy-roster.jsregistersnewtemplates;Heavyusesnormalfolder. Currentstagepoolselectionequaleligible;ordinaryknownwindowsstage-relative,resetonmapentry. Newtypenumericstatsremainexistinggenericdefaultsuntilsupplied;automatic-eventgatefalseunchanged.

Admin Disableautoattacks checkbox:setAutoattackEnabled onbothweaponcontrollers;stopsautomaticdamage/visualsimmediately,EX/movementremain. Defaultautoenabled;skillcooldownsunmodified.

LATEST full campaign chart:campaign-config.js/campaignEnemyRows(32rows),campaignSettings.enabledtrue. campaign-schedule.js internalclock0=>freeze360=>stage2anchor390;Arisu720thenOPS780freezesuntilbothdefeated;stage3anchor840/Iroha1050freeze;stage4anchor1080/Neru1200unfrozen=>1380Sweepers/1500allregularfallback. ExactchartHP/ATK/SPD/EXPwithoutlegacystacking. BossfightMega chance.005. Legacy formationsremainbenched. Fulltable/currentrulesinNOTES.


## Endless enemy pool (current)
Editable in `campaign-config.js`: `endlessEnemySettings`.
From internal 23:00, Mob1/2/3, Pedrozilla, Arius1/2/3, Highlander1/2/3 and all three Sweepers share HP 5000, ATK 15, SPD 1, EXP 25. All are Mega variants; listed HP/ATK are used directly, without another Mega stat multiplier. Mega size, hitboxes and population weighting remain active.
At internal 30:00, non-Mega Midori joins: HP 9000, ATK 5, SPD 1.5, EXP 25. Its listed SPD overrides its former player-relative speed.
The internal chart clock continues from its Stage 4 value during endless mode. The pool can begin at 23:00 while the final Stage 4 boss is alive. Arrivals mix types evenly; generated events also use these defaults unless their chart explicitly overrides stats. Existing enemies retain their spawn stats. Previous generic stage scaling remains benched.


## Enemy SPD reference
Enemy table SPD values are ratios of the player's unmodified base travel speed (`playerSettings.speed`, currently 240 pixels/second), not raw pixels/second or the player's upgraded current speed.
`enemySpeedPxPerSecond = enemySPD * playerSettings.speed`
Examples: SPD 0.35 = 35% = 84 px/s; SPD 1 = 100% = 240 px/s; SPD 1.5 = 150% = 360 px/s.
`movementBase` (180) is an internal movement normalization value; it does not change this reference. Player SPD upgrades do not automatically increase enemies' table-based speed.

Event spawn positioning: every formation starts outside the current viewport with full sprite clearance plus24px. Ring placement surrounds the whole viewport, filtered to legal playable entry arcs. Placement is checked again at insertion after camera movement. Timed/generated formations share this behavior.

Cluster count:20 for current scheduled and generated cluster events. Formation is a filled circular disk, radius=spacing*sqrt(count-1)/2; radial placement radius*sqrt(index/(count-1)) with golden-angle rotation. Offscreen entry constraints remain active.

Seeded events: after internal17:00 choose among all10 spawn patterns/variations, using current campaign time-window pool or endless23:00 pool (Midori30:00). Seed determines identity/entry/count/lifetime/interval. HP/ATK/SPD/EXP resolve through eventEnemyProfile. Default group count12-60 exceptCluster20, lifetime14-24 active seconds, interval35-55. HordeRush repeats2s; Wave oscillation angle=lockedAngle+sin(age*4)*0.65; Fastball/Ambush charge delay0.65s. No unconfigured landing damage added. All entries remain offscreen.

Supernova EX damage tick interval is now1second per enemy (`supernovaSkillSettings.hitCooldown`), replacing0.2s. Active duration remains3seconds.

Mega Pedrozilla size now equals Elite Mob size, replacing the earlier20%-larger-than-Sweeper setting. Normal Pedrozilla remains Sweeper-sized. Skipping phases are staggered per spawn, with independently varied cadence.

Boss behavior defaults now live:game-config.js/bossBehaviorSettings. Shiroko chase;Arisu8s interval/2s charge-up/1100px/s locked charge;Iroha6s alternating cannon/artillery;Neru7s alternating2s bullet hell and0.55s compression+1s aimed leap. Boss damage uses configured ATK/shared player I-frames. Neru bullets12every0.25s,240px/s;artillery delay1.3s/radius64;Neru landing radius75. Animation lineup now includes boss actions and GIFs. Unspecified values are editable initial testing defaults.

## Crafter formulas (current)
- Base drop chance:`1/1301`, optionally multiplied by futureCreditCard `player.crafterDropMultiplier`; cap20groundCrafters.
- Next enhancement rank:`r=currentRank+1`.
- Credit cost:`50*r`.
- Success:`min(1,max(0.1,1-0.1*(r-1))+enhancementRateBonusPercent/100)`.
- Flat enhancement damage:`2*enhancementRank/max(1,primaryProjectileCount)`; added after base weapon bonuses, then scales with ATK/final modifiers. Internalweaponfactor divides by damageRules.baseScale(10).
- Paid failure consumes Credits and Crafter; no rank increase. Free belowMAXlevels consume only Crafter. Items stop atMAX.
- Umbrella-only mainweapon awakening:LV7+1SecretTechNote+Crafter. Removed from ordinary level-up choices; other weapon awakenings unavailable.
- Future enchantment roll cost250Credits; feature inactive pending shop unlock/enchantment list. Starting weapon excluded.
- Future GoldenCrafter chance:`(1+minuteTimer/20)/100`, max1; requires an available synergy using twoMAXweapons. No recipes yet, so no liveGoldenCrafterdrops.
Current implementation:game-config.js/crafterSettings,crafter-rules.js,crafter-system.js.

GoldenCrafterfoundationlive:eligibleMAXpairfromsynergy-recipes.js requiredforautomaticdrop;probability=min(1,(1+floor(survivalSeconds/60)/20)/100) perdefeat;cap1. Adminmanualspawnbypasseseligibilityonly. Confirmfusionconsumes2MAXingredientsand1GoldenCrafter,creates1definedsynergy/freeingslot;cancel/invalidpairconsumesnothing. NoCreditscost. Inheritsupto2enchantments,oneperingredient. Live recipescurrentlyemptyuntildefinedweaponsareadded.

LuminousNova:luminousNovaSettings/luminous-nova.js. Baseweaponfactor1.4,damageLVmultiplier=(LV>=2?1.2:1)*(LV>=4?1.3:1). FireRate=1+[LV>=3]+[LV>=5]+[LV>=7];interval=round(60*(2.5/fireRate)/(1+Haste/100))/60,min1frame. Duration45/60s,speed20*60=1200px/s,hitCD10/60s,piercingunlimited,diameter=normalSpriteSize*sweeperSettings.sizeRatio. LV6KBdistance=(7*60)*(15/60)=105pxbeforeresistance. EnhancementdamagesplitsbyFireRate(primaryshotsperbasecycle).

LuminousNovaEX:luminousNovaSkillSettings/luminous-nova-skill.js. Circle+diamondpattern. Aura25s addsDB1.51(+0.51toDBsum)andCRT22.3percentagepoints. BankactualacceptedHPdamagefromowner'sallattacks,excludingoverkill/misses. Finisher=min(round(bank*0.1),floor(50*damageRules.baseScale*totalCharacterATK/100)),baseScale10. Cap500at100ATK,1000at200ATK. Buffendsbeforegunopening0.336s/charge0.9s;fixedfinisherhasnoadditionaldamage/critroll. Projectile134.4pxdiameter/1200pxpersec/1s/onehitpertarget. Normalshared180sEXcooldown.

Amplifierfinisher:selecthighestcurrentHPvisibleenemyatlaunch,homing,singletarget. Initialhit=sharedattackdamagewithweaponfactor2.81(normalcritallowed). Additionalhit=100%storedcharge,noncritical. Storedchargecurrently=min(round(.1*actualAuraDamage),floor(50*10*totalATK/100)),retainingearliercaprule. Onlystoredportionuses5000%cap;initialhitisseparate. Nootherenemiescanbecollaterallyhit.

LuminousEXendingsplit:AoEdamage=min(round(0.1*actualAuraDamage),floor(50*10*totalATK/100)),noncritical,toalltargetswithin240pxofplayer(bodycontactincluded). Separateaimedbulletuses281%ATK/sharednormaldamagecalculation,unlimitedpiercing/onehitpertarget. Aimlocksaftercharge. NoautohomingorhighestHPtargetselection.

### Luminous Nova automatic shot direction
Projectile angle = current shared arrow/crosshair aim at launch. Direction remains fixed in flight; no random enemy targeting.

### The Princess and the Key (Supernova + Luminous Nova)
Golden Crafter recipe requires both ingredients at LV 7. Four bullets fire every 3/60 = 0.05 seconds (80 bullets/sec), unaffected by Haste. Narrow 12-degree full spread follows current arrow/crosshair aim; each projectile keeps its launch angle. Damage factor 0.5 uses shared ATK/randomization/critical/modifier formulas (3–7 before bonuses). Each bullet can hit up to 4 times, with 15/60 = 0.25 seconds between hits on the same enemy. Lifetime 20/60 seconds; speed 15*60 = 900px/sec. Knockback speed 1*60 = 60px/sec for 3/60 = 0.05 seconds (3px before resistance). Settings are in princessKeySettings. No EX skill defined yet.

- Updated synergy stream: four individually staggered shots per 0.05s cycle. Random gap weights are normalized to preserve 80 bullets/sec; each shot picks a random angle inside the 12-degree spread. Lifetime extends as needed to reach the farthest visible viewport edge plus 64px (minimum 20/60s), at 900px/sec.

- Synergy range update: no lifetime-based expiry. Princess/Key bullets travel at 900px/sec until their complete head bloom and continuous tail leave the current camera viewport, or their four-hit budget is exhausted. This supersedes the previous viewport-derived lifetime.

### Gacha Files
Boss-type defeats drop a File using `sprites/icons/3 Stars Character Icon.png`. `fileSettings` and reward functions live in `gacha-file-rules.js`.
- Disjoint rolls: 5% super, 9% triple, remaining normal. No eligible super item means a normal File; the super item registry is empty until actual super items are defined.
- Normal products:70%weapon/30%equipment,10%new-product eligibility,up to5fallback attempts. Uses current level-up choices and respects synergy ingredient exclusions.
- Triple products use a shadow inventory and original free slots: product2 needs at least2initial category slots for new gear;product3 needs at least3. No inventory overfill or overlevel.
- Extra100Credits replace unavailable products. Provisional editable saturation chance is5percentage points per MAX slot,capped60%; exact curve was not supplied.
- Credit formula: floor(floor(a/(3+irandom(2)))*M*(1+b*(20+irandom(10))/100*M)), where M=(1+moneyUpBonus/100)*stageCoinMultiplier. Normal(a301,b1),Triple(a399,b3),Super(a399,b5). Unmodified ranges72–130,126–252,158–332.
- Opening awards Credits once. Accept applies each product;Drop discards it. Boss stage advancement waits until the File is resolved. Map changes clear uncollected test Files.

### The Princess and the Key EX
Casting pattern:linked overlapping rectangular frames matching the supplied icon,including its small upper-right frame. Recognizer permits scale,stroke order and moderate aspect variation. Uses independent standard180second weapon cooldown and admin skill-slot casting.
Default timing:Kei's25second amplifier (+51%damage,+22.3percentage points critical chance),with Supernova's3second aimable beam after its normal emergence. Beam hits each enemy every0.5seconds (six ticks),using Supernova base damage and drawing-accuracy multiplier. Additional damage per tick=Kei charge formula:min(round(0.1*actual damage dealt during current buff),floor(50*player base attack afterATK)). Bank excludes overkill through the existing damage event.
Each enemy first hit leaves one stationary residue per cast. Its4second timer does not restart; further hits increase its stored charge. On expiry,it deals that noncritical charge as a240pxAoE using the same formula/cap as Kei's ending blast. Residues are independent of enemy movement/death. Buff,residue and beam timers pause with gameplay. Settings in princessKeySkillSettings. This supersedes earlier notes that this synergy had no EX skill.

- Princess/Key EX replaces its normal autoattack during beam presentation: no bullets during emergence/retraction; during the3secondbeam it sprays blue plasma at60bullets/sec (80*.75),with24degree full cone (12*2). Same damage/hit limit/knockback,still unaffected byHaste. Normal pink80/s resumes after presentation while remainingbuffcontinues. Ratios are editable in princessKeySettings.
