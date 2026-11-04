# Development lab

Keep experimental project parts here until they are explicitly approved for integration.

Enter through the Development button on `project.html` while signed in as Firebase UID `k8ncp3tED8YjjxoTXHlYBSoxcFW2`. The hub and movement preview also check the Firebase session when opened directly.

The movement preview uses the shared sprite assets in `../sprites/`.

These browser checks control navigation and visibility. Static HTML, JavaScript, and images remain downloadable from the web server. Any future private development data or privileged operations must enforce the admin identity in Firebase Security Rules or on a server.

## Movement tuning

- `movement.html`: canvas `width` and `height` set the movement area.
- `movement.js`: `spriteSize` sets display size; `spritePadding` adds display margin; `frameDuration` sets walking cadence; `movementSpeed` sets travel speed. Enable `showSpriteBounds` to inspect frame rectangles.
- `sprite-layouts.js`: source-pixel `columnEdges` and per-column `rowEdges` control actual frame cropping. The sheets have uneven row spacing. Move a boundary only after checking both frames sharing that edge.
- Each character's `rows` mapping in `movement.js` selects the source row for each of eight directions. Adjust mappings if an imported pose faces differently.

Hold two perpendicular keys for diagonal movement. Diagonals are normalized to the same speed as cardinal movement. The on-screen pad also supports all eight directions.

## Playarea simulation

The canvas is a 1280 x 720 simulated full-screen view, scaled down by the `.simulated-screen` CSS width. The Playarea image is scaled proportionally to the canvas height and repeated infinitely in both horizontal directions. Only visible tiles are drawn from a single shared image; off-screen tiles have no retained objects. Tile seams may be visible because the supplied illustration is not a seamless texture.

`topMovementPadding` controls optional space above the movement area; its default of zero allows access to the windows. Sprite bounds still keep the character inside the screen. Camera X follows the selected character with no horizontal clamp; camera Y stays zero. Characters still move in eight directions. Toolbar controls sit outside the simulated game screen: Dev Lab, Admin Tools, Reset Scene, and Sprite Bounds.

## Future enemies

Use `world-state.js` to remember enemy IDs, world X/Y, health, and other state independently of tile rendering. `getVisibleEnemies` returns nearby records without deleting off-screen enemies; update movement/state with `rememberEnemy` and explicitly remove defeated enemies with `removeEnemy`. No enemies are spawned yet. This store survives scrolling during the current page session, not browser reloads. Background tiles never own enemy records.

## Interchangeable sprite sheets

Open **Admin / Sprite sheet testing** below the simulated screen. Choose a target character, select a local image, then apply it. Nothing is uploaded or written to the project; reload restores defaults. Each character can retain a different test sheet during the session.

Use the regular 5-column/8-row grid for new image dimensions. Margins remove padding in source pixels before dividing the grid. Built-in cropping uses the target character's measured boundaries for compatible images. Row indices are zero-based in the displayed direction order. Mirroring accepts names such as `left,upRight`. Display reference size controls proportional size. All test cycles use five frames. Enable Sprite Bounds in the toolbar to inspect crops. Restore Built-in Sheet restores the selected character's original image and animation settings without resetting position.

Arona now uses `Arona_8Directions_64Frames_Transparent.png`: an 8 x 8 grid of 192-pixel cells. Her per-character `frameSequence` uses all eight frames and `frameDuration` is 60 ms. The tester now has an editable column count; use 8 for this Arona sheet and 5 for the original Plana/Mob sheets. All imported test cycles use the selected layout's complete column count.

Plana now defaults to `Plana_8Directions_64Frames_CLEAN_Transparent.png` for development testing: 8 x 8 cells of 192 pixels, eight frames at 60 ms each. Her directional row ordering differs from Arona and is documented in `movement.js`. The original `Plana Sprite Sheet.png` remains in sprites unchanged.

Current Arona asset: `Arona fixed 2.png` (1254 x 1254, eight columns/eight rows). Fractional 156.75-pixel crop boundaries preserve the complete image grid. Both playable characters now use 90 ms per animation frame (720 ms per cycle); travel speed stays 180 pixels/second.

Current Plana asset: `Fixed Plana 2.png` (1254 x 1254, eight columns/eight rows). Crops use 156.75-pixel cells; display reference size is 175.5 to preserve the prior scale. Frame timing remains 90 ms.

Current defaults restored: `Plana Sprite Sheet.png` and `Arona Sprite Sheet.png`, five columns/eight rows with their original measured crop boundaries, directional settings, and display scales. Animation timing uses the original 110 ms default. Alternate files remain available through the session-only sprite tester.

Plana row mapping corrected: top-to-bottom rows are down, down-left, left, up-left, up, up-right, right, down-right. Each direction now uses its own unmirrored row and all five columns. Prior substitute-row and mirroring workarounds are removed.

Iroha Boss is available as an admin test avatar, using `Iroha Boss.png` (1254 x 1254, 8 columns/8 rows). All eight frames animate at 110 ms each. Select Iroha Boss below the screen or target her in the sprite-sheet tester. This adds no boss combat or AI.

Current boss asset: `Iroha Boss Horizontal.png` (1448 x 1086; eight columns, six rows of 181 pixels). Rows 0/1 are left/right movement; attack and flag rows are reserved. Iroha uses `spriteSize: 260`, twice the normal 130. `horizontalFacingOnly` allows eight-direction movement while selecting only left/right sprite rows. Vertical movement retains the last horizontal facing. For local sprite testing of this six-row sheet, use its built-in crop layout.

Updated Iroha sheet dimensions: 2400 x 1440, eight columns/six rows of 300 x 240 pixels. Crops retain full attack-effect cells. Measured foot anchors keep tank ground placement consistent between rows. `transitionDuration: 100` controls the brief action/facing blend. Held movement resumes after attacks with the previous walking phase.

Current Iroha source: `Iroha Tank Battle Sprite Sheet.png` (1705 x 923), eight columns/six rows with refreshed source crops and foot anchors. Existing movement, cannon, artillery, large display size, and 100 ms pose transitions remain enabled.

Current Iroha asset: `Iroha Tank Sprite Animation Sheet.png` (1448 x 1086, 8 x 6 grid of 181-pixel cells), with refreshed foot anchors and display reference size 165. Existing movement, both attacks, and pose blending remain enabled.

## Aiming preview

Arrow visibility defaults to on and has its own toolbar toggle. Left-click the canvas to switch between character-facing aiming and cursor aiming. Cursor mode draws crosshair.png at the pointer and points arrow.png toward it, accounting for CSS scaling and camera scrolling. Click again to restore facing mode. Reset Scene restores facing mode but preserves arrow visibility. Arrow and crosshair sizes are commented in aiming.js. The supplied crosshair image currently appears as a gradient square; it is used as provided.

## NPC / enemy testing

Open the admin NPC panel below the screen. Select a sprite, AI on/off and chase/wander/idle behavior, then spawn a random batch or choose Cursor Spawn and left-click inside the screen. NPC tool clicks override aim-mode clicks; choose Random Spawn to restore normal aim clicks. Inspect mode selects an NPC under the cursor; Delete mode removes one.

Use the population list or inspect tool to select an NPC. Tools include AI settings for selected/all NPCs, bring to player, 25-HP damage, heal, delete selected/visible/all, AI pause, and single-frame stepping. Debug bounds and health bars are optional. Spawning is capped at 200 with batches of up to 50. NPC speed is 144 px/s, 60% of player speed.

Records live in world-state.js independently of background tiles and survive scrolling, but not reloads. Off-screen rendering is culled while simple AI still updates. This is movement AI and test health only: no automatic attacks, contact damage, collision resolution, or production spawning yet. Reset Scene resets the controlled avatar; use Delete All NPCs to clear the population.

## Two-map transition testing

The Switch Map toolbar button alternates Playarea (infinite horizontal scrolling, fixed camera Y) and Playarea 2 (infinite vertical scrolling, fixed camera X). Characters retain eight-direction movement; only the non-scrolling axis has screen boundaries. Each map remembers avatar positions and keeps its own NPC population, AI state, and health during the session.

The transition flips a 12 x 7 checkerboard in a center-out ripple, alternating horizontal/vertical tile flips. Simulation and canvas clicks pause during the transition. Two temporary screen snapshots are released on completion. Reduced-motion preferences switch maps without the flip. Tune density/timing in map-transition.js. Aim pointers, cursor spawning, inspector selection, debug bounds, and render culling account for both camera coordinates. Map 2 is scaled to screen width and tiled only vertically; Map 1 is scaled to screen height and tiled only horizontally.

## NPC damage feedback

NPC health bars and selection outlines are removed from the game screen. HP remains in world state and the admin inspector. The toolbar Sprite Bounds toggle controls crop outlines for both the player and NPCs. Damage Selected uses `damageEnemy` in world-state.js, which also triggers a 240 ms white sprite pulse (45 ms smooth rise, then fade). Future damage sources should call this same helper. The pulse uses a cached white silhouette preserving image transparency, and advances even when AI is paused. Tune timing/intensity in damage-feedback.js. Defeated test NPCs are still removed immediately.

Map-switch behavior revised: both backgrounds share the same player/NPC world and population. Switching preserves every entity position and the camera origin; only the scrolling axis/background changes. Locked-axis boundaries are relative to the retained camera origin. Off-screen NPCs are not clamped into view. Checkerboard snapshots contain only backgrounds; NPCs, player, damage feedback, bounds, and aiming render afterward and never flip.

Map transition now shrinks old-map tiles uniformly toward their centers in a staggered checkerboard ripple, revealing the new background underneath. It retains only one temporary background snapshot. Characters, NPCs, arrows, and crosshair are drawn afterward and are unaffected.

Map 2 player wall bounds are `leftWallRatio: 0.12` and `rightWallRatio: 0.88`, plus sprite clearance, editable in movement.js. Existing out-of-corridor positions are preserved on switching; movement back inside is allowed while further outward movement is blocked. Player movement, held inputs, AI, damage feedback, attacks, aiming and cursor tools continue throughout checkerboard transitions. Only another map-switch request is temporarily blocked.

Camera recentering: after switching axes, the retained player screen anchor smoothly approaches the center of the scrolling axis. `cameraRecenterSpeed = 7` controls catch-up; the exponential blend is frame-rate independent. The other camera axis stays fixed and no entity world position is changed.

Chase AI now pursues the exact player world-space center using continuous steering. Eight-way quantization affects sprite facing only. Movement clamps to the remaining distance to avoid overshoot/jitter; no 65-pixel stop radius remains. Chase NPCs ignore viewport containment so large bosses can reach a player near an edge. No physical collision separation is implemented, so NPCs can overlap the player center during testing.

## Playarea 3: seeded two-axis world

Switch Map now cycles Playarea -> Playarea 2 -> Playarea 3 -> Playarea. The third map scrolls infinitely in both axes using the six images in `sprites/playarea 3`. Fixed seed `20261101` and coordinate hashing select the same tile at the same grid coordinate on every reload, regardless of exploration order. Weights for tiles 1-6 are 40, 25, 16, 10, 6, 3 (percent chances). Tune `worldSeed` and `tileWeights` in `tile-world.js`.

Each image is scaled to 960 x 720 world pixels. Only visible tiles are drawn; collision queries generate rectangles for nearby tiles without retaining an infinite cache. `obstacleBoxes` lists editable rectangles in original 1448 x 1086 image pixels. They cover stalls, gates, lantern stands, and decorations. Sprite Bounds displays them in yellow. Characters use a smaller foot-level rectangular footprint, with substep collision and axis sliding to prevent crossing obstacles diagonally or at high speed. NPCs use the same collision system, including chase AI. Chase does not yet pathfind around blocked objects.

Random spawning retries clear locations; cursor spawning rejects obstacles. Map switching preserves positions even if a new obstacle surrounds an actor: outward escape movement is permitted without relocating the actor. The original two maps retain their respective axis limits and walls. All features remain in Development.

Playarea 3 tile spacing now overlaps by 2 world pixels on both axes (958 x 718 origin spacing for 960 x 720 artwork). Rendering snaps edges to pixels; collisions use the same adjusted tile origins. Updated tile 1-6 probabilities: 35%, 23%, 16%, 11%, 10%, 5%. The fixed seed remains unchanged, though updated weights intentionally change tile selections.

## Playarea 4: finite angled island

Switch Map cycles through four areas. The fourth uses the entire `play area 4.png` once at `islandScale = 1.5` (2172 x 1629 world pixels), with a camera clamped to its image boundaries. On first entry the map origin positions the open plaza under the current player without changing actor world coordinates.

`island-world.js` defines an angled shoreline polygon, multiple building/tree/bench/pond polygons, and thin fence segments, all in source-image pixels. Movement uses a foot-level actor rectangle and substeps with axis sliding. NPC placement rejects water and obstacles. Sprite Bounds exposes collision outlines in yellow for tuning. The tall center tower blocks only its foundation: its back projection stays walkable, and a clipped tower layer occludes actors behind it. All other buildings block their footprints.

These shapes were authored from the illustration and should be checked visually in the preview. The map does not tile or scroll beyond the image. Existing NPC world positions remain unchanged on map switches, including actors outside the island; delete/re-spawn such test actors on valid island ground if needed. Chase movement collides with obstacles but does not pathfind around them.

Island update: zoom is now 2x (2896 x 2172 world pixels). Only the six building footprints remain obstacles; trees, bushes, benches, fences, and pond are walkable. Shoreline points now follow the inner paving/seawall with a 10-source-pixel safety clearance, including the concave southern inlet. Tune `islandBoundary` and `shoreClearance` in island-world.js. Center-tower behind-building behavior remains intact.

Northern island boundary now follows the recessed seawall around/behind the tower instead of a straight line through the sea. Island collision sweeps to contact and projects remaining motion onto nearby polygon tangents, allowing natural gliding along angled buildings and coastline without penetrating them.

## Map soundtracks

Each map uses its stage-numbered MP3 from `Audio/`. Music begins after a user interaction because browsers restrict autoplay. Admin Tools contains a 0?100% volume slider (default 35%) and Pause/Play music. Map changes crossfade for 900 ms. Outgoing tracks are paused, rewound, and their source unloaded at fade completion; only the active track loops. Audio uses streamed media elements rather than fully decoding long files. Leaving the preview releases all tracks. `map-audio.js` documents paths and fade duration.

The island pond is again solid: an oval collision polygon includes the raised rim at source center (890, 300), radii 54 x 43. Angled sliding stops against it rather than passing through.

Additional solid Stage 4 patches: the large southwest fenced lawn and the triangular planted area southeast of the tower. Their angled curb polygons are documented at the end of islandObstacles and use the same slope-sliding collision response.

## Fixed character sizes and future integration

See MIGRATION_NOTES.md. scene-metrics.js defines fixed 112-pixel normal and 224-pixel boss sprite areas with 7-pixel padding. viewport.js now matches canvas dimensions to CSS dimensions so characters keep their apparent size when the view grows. Maps 1/2 adapt their background scale to viewport height/width; Maps 3/4 retain fixed world scale and show a larger camera view. No project gameplay integration has been performed.

## Shiroko GIF boss

Shiroko Boss (GIF test) is available in admin avatar swaps and NPC spawning. Her original seven-frame GIF is decoded losslessly into `generated/shiroko/frame-*.png` with its 30/40 ms timing in shiroko-animation.js. gif-animation.js plays these in canvas reliably, including while idle; no additional directional frames were invented. The original GIF is unchanged. She uses fixed boss size 224, NPC speed 120 px/s, eight-direction movement and mirrored left/right facing. No Shiroko attack is defined yet. If the source GIF changes, regenerate the decoded frames and duration metadata.

## Player/NPC contact testing

Contact uses centered proximity bodies and swept player movement so running through an NPC is detected even if the player passes it between frames. An NPC reaching the player flashes and bounces outward (52 px plus overlap separation), with 600 ms recovery before chasing again. Player-driven contact gives a smaller push (14 px plus separation) and 180 ms recovery. Recoil eases out over 180/90 ms respectively and uses map collision, so solid obstacles cannot be crossed. Short cooldown prevents per-frame retriggering. These values are editable in npc-contact.js.

Contact now deducts HP from both sides, using the editable contact damage settings; each accepted hit gives the player 0.5 seconds of I-frames. Player control is never locked or bounced by this test reaction. AI-off NPCs can still react to contact; admin Pause AI freezes contact physics too. GIF animation and visual damage pulses keep playing. Moving player input is measured from actual world displacement, not just held keys.

## Player HUD

The HUD is a screen-space overlay inside the simulated screen. EXP occupies the full width at the top, using the supplied left/right caps and repeating middle pieces so it adapts to any viewport. An 80-pixel framed active-character portrait sits below at the left, with HP to its right. HP uses the supplied empty/filled sprites. No portrait-box asset was present, so the frame is CSS and the portrait is sampled from the active sprite/GIF.

hud.js reflects existing hp/maxHp/exp/maxExp properties, defaulting to 100/100 HP and 0/100 EXP while gameplay systems are unimplemented. It does not add regeneration, XP rewards, or combat mechanics. HUD artwork stays outside the checkerboard background transition and pointer events pass through to gameplay. Preserve this layout when migrating to the project screen.

## HUD loadout slots

Removed the extra character-name and numeric HP text beside the portrait. Beneath HP are six attack slots and six equipment slots, using six equal flexible columns and 5.2px gaps, aligned with the health bar (portrait remains 80px). The HP bar top edge aligns with the portrait. Empty attack/equipment positions use attack-slot.png/equipment-slot.png. Once populated, the base switches to empty-slot.png and the selected item icon is overlaid, hiding the placeholder sword/clothing artwork.

Set character.attackSlots or character.equipmentSlots to arrays of up to six `{ name, icon }` entries, or call the HUD controller's `setSlot('attack'|'equipment', index, item)` with zero-based indices; null clears the slot. Loadouts are stored per character. No attacks/equipment are auto-assigned and no selection menu or item mechanics are introduced.

HUD level display: bitmap-font.js reads font.png as 20px cells in 15 columns beginning at ASCII space. The upper-right label below EXP shows `LV: 1` by default and reflects character.level when set. It grows leftward for additional digits, uses crisp sprite glyphs, and does not add XP/level-up gameplay.

## Player EXP, health, and invincibility tools

Admin Tools includes Add EXP (editable amount), Next Level, Reduce HP, Gain HP, Full Heal, Reset Player Stats, and Invincibility. Development initializes every controllable character at level 1, 0 EXP, 100/100 HP, invincibility on. State stays per character for this page session and updates the HUD. NPC clones explicitly disable player invincibility.

The EXP curve in player-stats.js is linear: 50 + 15 * (level - 1). Current levels 1/2/3/4/5 require 50/65/80/95/110 EXP to reach the next level. Edit startingLevelExp and expIncreasePerLevel to tune these values. Awards preserve overflow and can grant multiple levels. Invincibility prevents death rather than damage: Reduce HP still works, including down to zero, and damage still flashes. `isPlayerDefeated(character)` returns true only at zero HP with invincibility disabled; use this guard for future defeat handling. Healing caps at max HP and damage caps at zero; health loss triggers existing white feedback. HP 0 does not end the development preview. Reset Player Stats restores level/EXP/HP and enables invincibility again. NPC contact now damages the player and enemies; enemy defeats can drop EXP and bonus loot.


## Ground EXP reports
Defeating an NPC through world-state.damageEnemy drops one report at its feet. Admin deletion/clear does not award EXP. The spawn panel has an editable EXP reward (normal default 5, Iroha/Shiroko default 50; zero disables drops). Each report grants its exact reward: 1?10 uses Exp_Report_0, 11?19 Report_1, 20?49 Report_2, and 50+ Report_3 (the supplied highest-tier filename, called Report 4 in the request).

Reports stay at world coordinates with a random fixed rotation until collected, including offscreen and across map switches. Only visible reports render, below characters. Walking within 26px of a report with the player's feet collects it; movement is swept to avoid skipping pickups. Icon width 28px and pickup radius are editable in exp-drops.js. EXP overflow carries across multiple level-ups and updates the HUD immediately. Upgrade choice menus are deferred as requested. Use Damage Selected repeatedly on a spawned NPC to test a defeat; no player attack system is introduced. State lasts for this session only.

Curve reference: https://holocure.wiki.gg/wiki/Level_Up

## Credits and Secret Tech Notes
Enemy defeats also roll independent bonus drops: credits at an editable 1/90 chance (about 1.11%, a temporary default), Secret Tech Notes at exactly 0.001 (0.1%). Each pickup grants one unit. Rolls occur independently of EXP rewards, so an enemy may drop both bonus items, and zero-EXP enemies remain eligible. Admin deletion does not trigger drops.

Bonus loot shares report world-space persistence, fixed random orientation, visible-only rendering, and walk-over collection. Credits use sprites/icons/credits.png; notes currently use a temporary canvas paper graphic because no Secret Tech Note asset exists. Session inventory totals are visible in the EXP / HP panel and shared across avatar swaps. Reloading clears them. Player-stat resets do not clear inventory. Spending and max-level attack upgrades are intentionally deferred. Tune creditDropChance and secretNoteDropChance in exp-drops.js; getLootTotals returns a snapshot, and getGroundLoot exposes all ground records for testing.


## Drop testing and contact combat
The open-by-default Admin / Drops and contact damage testing panel spawns EXP reports, credits or Secret Tech Notes 80px to the player's right. Pickup value controls EXP and inventory quantities; EXP tier follows value. Collect All grants all ground rewards, Clear removes ground loot without awards, and Reset Collected Loot Totals clears only credits/notes. Forced drops bypass chance rolls for testing.

Mob remains the default basic enemy in the NPC spawn selector, with 5 EXP reward and chase AI. No automatic wave spawning is added yet. Contact deals 10 damage to the player and 10 to the enemy by default, editable in the test panel or contactSettings in npc-contact.js. An accepted hit grants 0.5 seconds of player I-frames, suppressing both sides' contact damage until expiry while recoil still works. The timer ticks once per simulation update, not per NPC; AI pause freezes contact simulation and the timer. Damage flashes remain 240ms and are separate from I-frames. Boss recovery behavior remains unchanged. Lethal contact enemy damage follows the regular defeat/drop path. Development invincibility still allows HP to reach zero. Admin Reduce HP is a manual tool and bypasses contact I-frames.

## Enemy death feedback
Lethal damage removes the living enemy immediately and drops its loot exactly once, while enemy-death.js keeps a visual-only copy. It freezes the current pose, turns nearly white over 35ms, launches 48px away from the damage source, then rapidly fades after a 120ms hold. Total duration is 380ms. Edit deathSettings for distance/timing. Copies cannot chase, deal/take damage, or grant additional loot; offscreen copies expire and fades continue with AI paused. Manual deletion remains immediate. Contact and admin damage pass the player as the hit source; future attacks should pass their source world coordinates as the third damageEnemy argument. Boss/GIF enemies use the same death feedback.


## Dynamic EXP fill visibility
The HUD preserves the original 90px left and 15px right caps, repeating exp-empty-middle.png and exp-filled-middle.png between them at a 3px segment pitch (previously 6px). Any positive EXP shows the complete filled-left cap; the middle clips proportionally to the exact EXP ratio, and a full bar shows the filled-right cap. At zero all three segments use their empty state. Fill clipping uses the exact fractional EXP percentage, with a 200ms easing transition and a narrow bright leading edge. EXP gains and level-ups do not flash or pulse, including during rapid pickup collection. The steady leading edge and smooth fill show progress. Reduced-motion settings disable the easing. Accessibility values include exact current/max EXP.

Right-click is reserved for future gameplay inside the arena: context-menu and right-button pointer defaults are suppressed on the canvas. Left-click aiming and NPC tools retain their existing behavior; developer menus outside the play area retain browser context menus.

## Character HP numbers
The HP row displays current/max health to the right of the bar using the supplied bitmap font at 1x scale. Values update on damage, healing, reset and avatar swaps. Plana starts at 110/110 and Arona at 140/140; maxHp is editable on each character in movement.js. Test NPCs retain their explicit 100/100 spawn HP.

## Starting pickup attraction
Plana starts with pickupRange=90 world pixels around her feet; Arona starts with pickupRange=0 and only collects on direct walk-over. All loot types accelerate toward Plana once they enter range, continuing to follow until collected. Swapping to a zero-range avatar cancels attraction immediately. Tune pickupRange on characters in movement.js and pickupMagnet acceleration/maxSpeed in exp-drops.js (1200px/s², 650px/s). Existing 26px direct-collection radius remains separate. Attraction uses frame time, clamps travel to prevent overshoot and preserves exact rewards.

## Gacha defeat effect and skill-book artwork
Secret Tech Notes now use sprites/icons/Ultimate_Skill_Book.png instead of the temporary paper graphic. Their drop chance and upgrade purpose are unchanged. Every damage defeat also creates a visual MP_Gacha.png effect behind the body: a 240ms eased upward rise, a 100ms stop, then a 160ms expanding fade/pop. Rise height scales with the defeated sprite's size. The effect is not a collectible or extra reward. Edit gachaSettings in enemy-death.js for timing and size. Effects remain world-anchored, render only near the camera, expire offscreen and continue with AI paused.

## Plana starting umbrella
Plana's first attack slot starts with her umbrella at LV 1. The HUD crops the closed umbrella pose from sprites/plana umbrella.png (x100, y228, width68, height304), rotates it clockwise 45 degrees and fits it inside the empty slot artwork without clipping. A small bitmap LV 1 caption sits beneath the slot, with reserved space before the equipment row. Original artwork is unchanged. Other characters retain their own loadouts. The starting umbrella now swings automatically using umbrella-attack.js. Slot items support iconCrop, iconRotation and level alongside name/icon.

Umbrella icon transparency: the HUD icon canvas explicitly overrides the global white canvas background with transparent. Slot level captions begin 2px above the slot's lower edge so the visible text outline sits against the box.

Attack/equipment grids share the health bar column, excluding the HP numbers. Six equal flexible boxes plus their gaps exactly span that column. Icons scale proportionally; level labels remain small.


## Plana umbrella attack
The equipped plana-umbrella attack automatically starts a 180-degree sweep every 1 second (start to start). Each swing takes 0.2 seconds and snapshots the arrow angle at its start, including cursor aim; hiding the arrow does not disable attacks. The closed umbrella pose uses handle-centered rotation, eased movement, fading prior poses and a subtle curved trail, with no brightness flashing. Plana can keep moving during attacks. Swapping to an avatar without the umbrella cancels its swing; Reset Scene resets attack timing.

Edit umbrellaSettings in umbrella-attack.js: interval=1s, duration=0.2s, baseRadius=64px, reach=176px, damage=23 HP. Swept sector checks cover the angles between frames and allow only one hit per enemy per swing. Damage uses the regular enemy damage/death/loot path. These are initial test balance values; no upgrade scaling or Arona starting attack is introduced. The arrow and umbrella share aiming.getAngle so crosshair and facing behavior agree.

Umbrella handle now orbits 64px outside the player center, preserving its 112px blade length (176px outer reach). Damage follows this outer annular sweep rather than hitting the center. The 0.2s swing uses thicker, more opaque pink arcs, longer trail history and stronger afterimages. Interval remains 1 second; baseRadius and reach are editable in umbrellaSettings.

Umbrella blur now uses dense angular sampling instead of five time-spaced ghost poses. Each ghost overlaps the next at roughly 0.7-degree spacing with low, tapered opacity. The fast midpoint renders about 124 poses for a continuous blur. Tune trailDuration (0.09s), trailAngleStep (0.012 radians), and maxAfterimages (192) in umbrellaSettings. Swing timing, damage and reach are unchanged.

Umbrella blur refinement: afterimages are composited onto a reusable offscreen canvas and blurred together by 3px, merging individual poses into a softer slash. Trail history is 0.13s and the blurred trail fades for 0.18s after the 0.2s attack ends. The lingering trail is visual-only and cannot damage enemies. Edit trailBlur/trailLinger/trailDuration in umbrellaSettings. The blur is applied once to the composite rather than individually to each afterimage.

Umbrella sweep arc is now 190 degrees, centered on the arrow direction (95 degrees to either side). Edit arcDegrees in umbrellaSettings. The damage sweep and blur use the same arc; duration remains 0.2s and interval remains 1s.

## Floating damage numbers
Player HP loss shows red bitmap numbers; enemy HP loss shows white numbers using the supplied font sheet. A 1-HP hit shows 1; other hits show actual HP lost, capped by remaining HP. Popups rise, fall and fade over 0.55s with slight horizontal drift, anchored in world coordinates. They continue after enemy death and while AI is paused. Contact I-frames prevent duplicate damage/popups; zero HP loss produces no number. Edit damageNumberSettings in damage-numbers.js for duration, fade, jumpHeight (14.0625px, half the previous height) and population cap. Cached text graphics and one shared font avoid loading an image per hit. All real damage paths, including admin test damage, use these helpers.

## Scattered loot toss
Enemy EXP, credits and Secret Tech Notes now toss out in independently random directions, landing 40-80 world pixels from the defeat position. The 0.28s outward flight eases to a stop, hops 18px visually, and spins slightly before settling. Pickup/magnet collection waits until flight finishes so contact defeats still show the toss. Plana's attraction and Arona's direct collection then work normally. Admin spawn-drop buttons use the same toss for testing; Collect All can still collect airborne loot. Edit dropScatter in exp-drops.js for distance, duration and hop height. Offscreen flight advances normally and rewards/chances are unchanged.


Current balance: basic Mob contact deals 1 HP to the player; other NPCs retain the editable 10 HP default. The admin panel has a separate Mob contact damage field. Plana's starting umbrella deals 23 HP per enemy per swing.

Pickup arrival: attraction and walk-over triggers now begin an accelerating flight to the active player's actual center (x/y), not the feet or a 26px collection boundary. Items grant rewards and vanish only within 0.5px of that center. They render beneath the player, so the sprite hides the final approach naturally. Arona still has zero attraction range: walking over a drop triggers the center-bound collection flight. Swapping avatars cancels the old avatar's pending attraction. Drop-scatter flights still complete before pickup begins.

Dropped item artwork now uses 35px width (25% larger than 28px), preserving each icon's aspect ratio. Report/book height is about 27.6px, roughly 30% of Plana's visible sprite height. All drop types share this size, including admin test drops. World actor sizes remain fixed.

Current contact rule: enemies do not lose HP from touching the player. Contact applies player damage and 0.5s I-frames only; enemy push/bounce reactions remain. Removed the enemy contact-damage setting and admin field. Umbrella attacks and explicit admin damage still damage enemies normally. This supersedes earlier bilateral-contact notes.

Enemy damage numbers display full hit damage, including overkill: a 23-damage umbrella hit on an 8-HP enemy still shows 23. Enemy HP remains clamped to zero and defeat rewards remain once-only. Player damage numbers continue to show HP actually lost.

Plana pickup magnet now detects loot around the sprite center rather than the feet. Starting pickupRange is 99px, 10% above 90px. Swept center detection handles movement between frames. Walk-over detection stays at feet, Arona retains zero magnet range, and attracted items still fly to the player center before collection.

## Dynamic HP and level-up healing
HP fill now maps exact health to the artwork's actual interior (source x72..628 of 643px) rather than treating the label/frame as fill. Changes ease over 200ms without flashing; reduced-motion disables easing. Current/max numbers and accessibility values stay synchronized. Every level-up sets HP to maxHp, including multi-level EXP awards and admin Next Level; EXP below the threshold does not heal. Existing max HP values remain unchanged.


## Elite enemies and random EXP rewards
Mob is the current basic/common enemy. Random spawns roll a 3% elite chance: Elite Mob is 224px instead of 112px, has 150/150 HP instead of 100/100, and deals twice normal Mob contact damage (2 instead of 1). Speed and attack behavior are unchanged. Bosses and playable-character test NPCs are excluded. Variant selection in the admin NPC tools supports Random, Normal Only and Force Elite Mob. Placement checks use the final enlarged size. Tune eliteChance and enemyVariant in enemy-variants.js; contact damage multiplies the current admin base damage.

Default enemy defeat EXP now rolls 90% Report 0 worth a random integer 1-10 EXP, or 10% Report 1 worth 11-20 EXP. Each defeat still drops one EXP report, independently of credit/note rolls. Value 20 now uses Report 1; Report 2 starts at 21 and covers through 49, and Report 3 covers 50+. Existing report scattering, attraction and exact rewards remain. The NPC admin Custom EXP field only applies when Override Random EXP Reward is checked; this preserves high-tier and zero-drop testing. These defaults replace prior fixed normal/boss EXP rewards.

## Updated elite HP and report rewards
Elite Mob now has 500 HP (5x normal Mob's 100 HP), retaining double size, double contact damage and 3% spawn chance. Every elite defeat drops three independently scattered EXP reports. Each rolls 80% Report 1 with random 11-20 EXP, or 20% Report 2 with random 21-49 EXP. Normal enemies retain one report with 90% gray Report 0, now worth random 1-9 EXP, or 10% Report 1 (11-20 EXP). Credit/note chances are unchanged and roll once per defeated enemy. Explicit admin reward overrides apply to each report, including zero to suppress reports. This supersedes earlier elite HP and reward notes.

Elite bonus loot now rolls a 20% chance for one credit pickup worth 5 credits, and an independent 1% Secret Tech Note chance. Normal rates remain 1/90 for 1 credit and 0.1% for one note. Edit eliteLoot in exp-drops.js to tune these defaults. Elite EXP reports remain independent and unchanged.

The NPC spawn control is split into equal-width buttons: Spawn Normal on the left and Spawn Elite on the right. Each forces its variant and uses the batch/AI settings. Random placement spawns immediately; cursor mode arms the chosen variant for left-click placement (Inspect/Delete modes switch to Cursor when a spawn button is pressed). Elite spawning is disabled for types without elite variants, currently all types except Mob. The variant selector remains available for cursor-based random 3% testing.

## Elite report floor and size update
Elite Mob size is now 150% of normal (168px vs 112px); HP remains 500 and contact damage remains 2. Each elite drops five scattered reports totaling at least 150 EXP. Initial report rolls still use the previous 80/20 Report 1/Report 2 weights, then low totals are topped up to the floor, preferring reports already at higher values and promoting tier artwork when values cross 20. Default per-report values remain 11-49. The guaranteed floor takes priority over the final tier ratio: five mostly-second-tier reports cannot reliably total 150. Custom elite EXP overrides also retain five reports and the floor, with at least 11 EXP per report; normal overrides remain unchanged. Tune eliteExpRewards count/minimumTotal in exp-drops.js.

## Sprite-shaped combat hitboxes
combat-hitboxes.js now defines larger stable body ellipses rather than the former 18%-size circles. Plana half-width/height are 27%/38% of her 112px display size, Mob 28%/38%, Arona 25%/39%, Iroha 44%/29%, Shiroko 30%/43%, with small per-type vertical center offsets. Elite dimensions scale with spriteSize automatically. Edit combatHitboxes or set character.combatHitbox to tune rx/ry/y fractions.

Contact uses a swept combined ellipse for pass-through detection; umbrella damage tests blade segments against enemy ellipses across the swept sector. Sprite Bounds displays these combat ellipses in yellow alongside the existing pink crop rectangle. Map obstacle/shore collisions still use their separate foot-level shapes, preserving angled-wall sliding. Damage values, I-frame timing, movement speeds and sprite artwork are unchanged.

## Variable percentage combat stats
The EXP / HP panel now includes ATK%, SPD%, CRIT%, PICKUP% and Haste% fields. Stats are independent per controlled character and session-only. Finish editing a field to apply; changing avatars refreshes the fields. Reset Player Stats restores all percentages to zero. NPC clones get separate base stats rather than inheriting player upgrades.

ATK/SPD/PICKUP/Haste are bonuses, starting at 0%; multiplier = 1 + bonus/100. ATK scales umbrella damage (base 23), SPD scales movement (base Plana/Arona 240px/s), PICKUP scales attraction radius (Plana base99px, Arona base0, so percentage alone does not grant her a magnet), and Haste scales attack frequency and swing duration inversely. +100% Haste gives a swing every 0.5s lasting 0.1s. Trail timing scales with the attack so visual tails do not block high-speed attacks. Haste snapshots at swing start. CRIT is direct chance, from 0% to 100%, with 2x damage on a successful per-enemy hit roll. Attack damage rounds to whole HP. ATK/SPD/PICKUP/Haste admin values are limited to 0-1000%; CRIT to 0-100%.

Edit defaultCombatStats, statMultiplier and rollAttackDamage in combat-stats.js to tune defaults/critical behavior. Each character stores values under combatStats: atkPercent, spdPercent, critPercent, pickupPercent, hastePercent. Base attack timing/damage remains in umbrellaSettings. No level-up choices or automatic stat growth are added yet.

## Credits and kills HUD
Under the EXP bar, an inset upper-right stack shows credits.png with collected credits, then MP_Gacha.png with confirmed enemy kills. Numbers use the bitmap font at 1.25x. Position is editable in .hud-counters (top36px, right clamp120px/12%/220px), leaving space beside the level display. Totals are shared across character/map switches for this session. Kills increment once on actual defeat, including admin damage defeats; admin deletion/clear does not count. Credits reflect collected inventory, not uncollected drops. Enemy death's rising/popping icon now uses Gacha_Ticket.png instead of MP_Gacha.png; its timing is unchanged.

## Automatic playtesting spawns
A Playtesting sidebar sits outside the simulated screen on its right (below it on narrow displays). Random spawning starts enabled. Stop/Start Random Spawning controls new spawns without deleting current enemies. Each second, up to ten Mob enemies spawn offscreen with chase AI and independent 3% elite rolls. These use default random defeat rewards, independent of manual NPC variant/AI/EXP override settings. The existing 200-enemy population cap applies; sidebar status reports actual batch count and cap.

Stage 1 chooses only left/right entrances within playable height. Stage 2 chooses top/bottom entrances inside the white-wall corridor. Stages 3/4 sample all four sides, validating map obstacles and island containment through the same placement checks as manual spawns. Offscreen margin is 100px to keep full elite sprites out of view. Invalid locations are retried up to 30 times per enemy, then skipped; finite maps with no valid offscreen ground cannot spawn a full batch. Spawn timing uses the game loop, so background tabs do not accumulate a timer backlog. Edit playtestSpawnSettings in playtest-spawner.js for rate/margin/attempts. Stop/start resets the batch timer. Reset Scene does not reset the spawning toggle.

## Critical and supercritical damage text
Critical hits now carry their type from rollAttackDamage through damageEnemy to floating numbers. Crits show yellow bitmap text with one exclamation mark and a slight italic slant (for example 46!). Supercrit visuals show red italic text with three marks (23!!!). Player damage remains plain red. The same 0.55s bounce/fade and overkill values apply. Tinting preserves dark glyph outlines.

Preview Crit Number and Preview Supercrit Number buttons in the EXP / HP panel display both styles without changing health or rewards. Supercrit trigger rules and damage multipliers are intentionally deferred per user clarification. Normal critical rolls still deal 2x damage. Future code can pass 'supercritical' as damageEnemy's fourth argument or showDamageNumber's fourth argument to use the visual style.

Current playtest balance: automatic spawning is 5 enemies per second. All spawned NPCs/enemies (including elites and bosses) use 84px/s base movement, reduced 30% from 120px/s. Player/avatar base speeds and existing SPD bonuses remain unchanged.

## Enlarged maps and reduced Mob health
Normal Mob now has 65 HP, 35% below the original 100; Elite Mob keeps its 5x health multiplier at 325 HP. Other NPC/boss base HP is unchanged. Values are configured in enemy-variants.js.

All map artwork/world dimensions now use mapSizeMultiplier=1.5 in map-bounds.js, independently of actor sizes. Stage 1 is still horizontally infinite but now 1.5 viewport heights tall, allowing vertical camera tracking clamped at the physical top/bottom. Stage 2 is vertically infinite but 1.5 viewport widths wide, with bounded horizontal tracking and correctly scaled white-wall limits. Stage 3 tiles are 1440x1080 (2px seam overlap retained), with obstacle rectangles scaled from their source artwork. Stage 4 scale is 3 instead of 2, with shore/building/pond geometry scaled together. Character, HUD, pickup and attack sizes stay fixed.

Movement, recoil and NPC placement on strip maps use world-space physical bounds rather than the moving camera viewport. Camera movement does not recenter entity coordinates. Offscreen spawning stays on the appropriate strip entrances and respects enlarged map walls. Existing transition input behavior remains live. Map collision geometry and camera helpers are documented in map-bounds.js; resizing still adapts Stage 1/2 finite dimensions to the viewport.

## Full-screen project-style preview
Use Simulate Full Screen in the top toolbar to fill the browser viewport with the live play area, hiding surrounding developer controls behind the preview. Exit Full Screen appears at bottom-right; Escape also exits. This simulates the project layout without changing the actual project page or browser chrome. Existing ResizeObserver resizes the canvas/camera view, preserving fixed character sizes and world coordinates. Stage 1/2 dimensions adapt to the expanded viewport; Stage 3/4 keep their world scale. Session, AI, spawning, health and loot continue. Held movement input is cleared when toggling, and focus/background keyboard access is restored on exit. No world reset or page reload occurs.

## Reference project/game viewport
The agreed screenshot reference uses a centered 1280x720 game area on a 1920x1080 display. Preview Game Area (1280x720) now opens that exact 16:9 area with a dark surround, rather than stretching gameplay across the browser. It fits smaller windows proportionally while ResizeObserver keeps world pixels equal to CSS pixels, so actors are not scaled. On a 1920x1080 browser viewport the margins are 320px horizontally and 180px vertically. Exit Game Preview or Escape restores the development layout. This establishes the future project layout reference; no gameplay is migrated to project.html yet.

## Visible crowd spawn threshold
The spawner now uses a 50-visible-enemy soft threshold. Below 50, the default is 5 enemies/s; at 50 or more, it slows to 1 enemy/s, restoring 5/s when the visible count falls. Counts use sprite/viewport intersection, exclude offscreen enemies and defeated visual remnants, and adapt to camera movement or preview resizing. The sidebar displays visible count and current rate live. Existing enemies remain active; this is a spawning throttle rather than forcibly hiding/deleting enemies, so a crowd can exceed 50 as offscreen enemies arrive. The session population cap remains 200. Tune visibleLimit and crowdedPerSecond in playtestSpawnSettings.

## Escape pause menu
Escape now pauses/resumes gameplay in both regular and centered game previews; it no longer exits the game preview. Use the dedicated Exit Game Preview button (or its pause-menu counterpart) to leave the preview. The sidebar also includes Pause Game. Pause freezes movement, AI/contact, attacks, loot toss/attraction, spawn timers, damage effects and checkerboard transitions while continuing to draw the frozen scene. Frame timestamps advance to prevent a resume jump. Music continues, with a working volume slider in Settings.

The overlay follows the reference: left-side character name and stat rows over a cyan-tinted translucent full character portrait with holographic scanlines, plus a central blue pause panel. Rows use Bond.png (HP), Tournament Water Gun.png (ATK), Crew Whistle.png (SPD), Event 27 - 10 Sided Dice.png (CRT), Event 06 - Buff 14.png (Pickup), Skill Book Node.png (Haste). Crew Whistle.png was not present, so SPD falls back to a small SVG whistle; adding the named asset automatically replaces it after reload. Plana_Portrait.png and Arona_Portrait.png supply holograms. Values reflect live current/max HP and percentage stats. Resume, Settings, Exit Game Preview and Return to Dev Lab are functional; no placeholder upgrade screens are added.

## Crowded-spawn direction priority
At the 50-visible-enemy threshold, 1/s spawns now prioritize the least populated legal direction relative to the player. Count all living session enemies, including offscreen approaching enemies, by direction. Stage 1 compares left/right; Stage 2 compares top/bottom; free maps compare four cardinal sectors by dominant X/Y offset. Exact-center enemies do not bias a direction. Ties are randomized. Placement retries begin on the least-populated side, then fall back to other sides in population order if obstacles/shore block that entrance. Below the threshold, normal 5/s spawning remains random. Visibility threshold, population cap and stage collision checks are unchanged.

The supplied sprites/icons/Crew Whistle.png is now present and used for the pause-menu SPD row. Removed the temporary SVG whistle fallback. Reload the development page to display the new artwork.

## Latest I-frame, elite and EXP balance
Player contact I-frames now last 0.2 seconds. Random Mob elite chance is 1%, with forced admin variants unchanged. EXP starts at 50 at level 1; moving from level L to L+1 increases the next requirement by round(15 + L/2). Costs for current levels 1-5 are 50, 66, 82, 99, 116. experienceForLevel sums these rounded increments with a constant-time formula, preserving overflow and full healing on level-up. These settings supersede the earlier 0.5s/3%/flat15 defaults.

Item level captions now fill 90% of each slot's width with proportional height and 1x bitmap source detail. Occupied level rows reserve 30px below the boxes to prevent overlap with equipment. Caption sizing stays responsive through viewport changes, font loading and multi-digit levels; labels remain tucked against the box edge.

## Seeded Stage 1 office tiles
Stage 1 now loads nine supplied backgrounds from sprites/playarea 1 and generates only horizontal columns with Stage 3's worldSeed (20261101). Tile 0 is the clear starting office. Other ordinary variants use editable weights [30,12,12,12,12,10,6,6] for clear office, four single-obstacle layouts, mixed-three, variation A and variation B. Tile choice is stable across reloads and exploration order; no vertical tile generation is added. Enlarged map height, bounded vertical camera and 2px seam overlap are retained.

The Blue Archive logo monument has a 3% natural chance. Independent left/right pity streams force a monument no later than 20 tiles after the previous monument (or the virtual starting anchor). Thus the first monument is within 20 tiles in each direction, same-side gaps never exceed 20, and the maximum gap crossing tile 0 is 40. Forced spawns raise the effective overall rate above the base 3%. Only monument column indices are retained as lightweight generation metadata; images are shared and only visible columns render.

Office source-pixel obstacle rectangles cover partitions, desks and the monument in office-world.js. Collision uses Stage 3's shared substepped rectangle/slide solver. Player movement, NPC chase/recoil and spawn validation use the same office geometry. Sprite Bounds displays office obstacle rectangles. Edit officeObstacleBoxes, officeTileWeights and officeMonument for tuning. Enemy records and loot remain independent of tile rendering.

Stage 2 is temporarily disabled and skipped during loading/map cycling at the user's request because its old sprites/Playarea 2.png background is missing. Maps currently cycle Stage 1 -> Stage 3 -> Stage 4. Re-enable maps.second.disabled after Stage 2 is updated; its existing configuration is retained.

## Stage 2 seeded palace obstacles and rare pool
Stage 2 is re-enabled with all 15 images from sprites/playarea 2. palace-world.js uses Stage 3's worldSeed (20261101) and row-coordinate hashing for consistent infinite vertical layouts, including negative rows. Width remains enlarged 1.5x with physical side-wall limits; rows overlap 2px and only visible rows render. Common layouts have a combined 95% chance.

The remaining 5% selects one rare variant with these conditional weights: exec-0f3168a5-cfa4-4915-9533-1ddd11cfce6f 10%; mansion-decagrammaton-statue-stone 5%; palace-hall-duo-statue-walkways 5%; palace-hall-kei-statue-obstacles 10%; mansion-vending-a-single-stone 35%; mansion-vending-b-pit-stone 35%. Their overall probabilities are respectively 0.5%, 0.25%, 0.25%, 0.5%, 1.75%, 1.75%. There is no Stage 2 pity rule.

Normal obstacles and vending machines use source-space rectangle hitboxes. The four rare statue variants block only their pedestal bases; pits/rubble elsewhere in those tiles remain solid. Tall statue silhouettes are redrawn over actors whose feet are behind the pedestal, permitting visible walk-behind behavior without turning the whole statue into a wall. Source rectangles/silhouette polygons are editable in palaceObstacleBoxes and palaceStatues. Movement, recoil and NPC placement share Stage 3's substepped collision/sliding; Sprite Bounds shows rectangles. Map cycling is restored to Stages 1 -> 2 -> 3 -> 4.

## Shared Stage 2 statue guarantee
Only palace-hall-duo-statue-walkways (index11) and mansion-decagrammaton-statue-stone (index10) share Stage 2's guarantee, as clarified by the user. Either variant resets the same directional counter. Exec, Kei and vending variants do not reset it. Like Stage 1, a qualifying statue appears within 20 tiles upward/downward from the starting anchor or previous qualifying statue, limiting the gap across the starting area to 40. Forced placements choose equally between the two, matching their equal natural weights.

The original seeded 5% rare pool and conditional weights remain the natural-roll baseline. When the shared pool has not appeared within the guarantee distance, a qualifying statue replaces the base tile, so effective statue frequency exceeds its natural rate. Tile choices remain independent of exploration order/reload. Only qualifying-row metadata is cached, not tile images or NPCs. Tune palaceStatueGuarantee in palace-world.js.

HUD level/equipment spacing refinement: item-level labels sit 6px above the slot's lower edge (4px higher than before) and use z-index3 above box/item artwork. Caption space is reduced from 30px to 18px, and attack/equipment row gap from 5.2px to 2px, bringing equipment 15.2px closer beneath the attack levels. Horizontal slot gaps and 90% caption widths are unchanged.

Stage 1 Blue Archive monument now blocks only its pedestal rectangle [94,595,1385,679] in source pixels. The letters and halo are walk-behind artwork, with visual silhouettes (including letter openings and halo center) redrawn over actors whose feet are behind the pedestal. Actors in front remain on top. Tune officeObstacleBoxes[8] and officeMonumentSilhouette independently. Seeded spawn rates/guarantees are unchanged.

Equipment rows now track the visible lower outline of item-level text with a 2px gap. HUD spacing uses measured glyph bounds and the slot image's transparent top inset, rather than a fixed caption reserve. ResizeObserver recalculates on row size changes; level updates recalculate for different text widths. Level text keeps its frame overlap and z-index3.

## New-game local-time seed
Procedural maps no longer use the fixed 20261101 seed. run-seed.js generates a 32-bit seed once at each page/game start by hashing browser-local date/time (including milliseconds and timezone offset) with random entropy. Stage 1/2/3 all share this seed, keeping each run's tiles consistent regardless of exploration order. Monument/statue guarantees continue normally.

New Game (New Seed) reloads the development run, clearing session enemies, drops, stats and counters and generating a fresh seed. Reset Scene, map switching, pause and preview sizing preserve the current run/seed. The playtesting sidebar shows the run seed and local start time. Stage 4 remains a fixed island image. This supersedes earlier fixed-seed/reload-consistency notes.

## Stage 3 new-year areas and shared regional rare guarantee
Stage 3 now includes twelve layouts: the original six, newyear-regular-07-single-ema, regular-08-two-obstacles, regular-09-three-obstacles, regular-10-four-obstacles, rare-grand-shrine and rare-lantern-stage. New layouts have source-space rectangular obstacle hitboxes and use existing spawn/movement/recoil collision and debug outlines. The ordinary pool weights are [25,16,11,8,7,4,10,8,6,5].

Natural tile chances are 1.5% Grand Shrine and 3% Lantern Stage; the remaining 95.5% uses ordinary weights. As clarified for this two-dimensional stage, every grid-aligned 20x20 region must contain at least one of these two rare tiles, sharing one guarantee. Natural occurrences of either satisfy it. A seeded fallback coordinate is only replaced when the entire region naturally contains neither; forced types keep the same 1:2 shrine/lantern ratio. Negative coordinates use floor-aligned regions correctly. This is a regional guarantee, not a maximum straight-line travel gap. Region inspection is cached as one boolean, not tile objects; choices remain stable during each locally seeded run and independent of visit order. Tune newyearRareSpawns/newyearRegionGuarantee/tileWeights in tile-world.js.

## Stage 2 common frequency and hitbox alignment revision
The common multi-object group now has 1.3x the single-object group's selection weight: group totals 130 vs 100, approximately 56.52% multi / 43.48% single within ordinary rolls. Four single variants share their group equally; mixed-four and variations A/B share the multi group equally. Rare natural weights and the shared statue guarantee are unchanged.

Removed references to deleted playarea 2-2.png/playarea 2-4.png duplicates, leaving thirteen actual tile assets. Rare offsets and guarantee/silhouette mappings now derive from the common catalog length or filenames to prevent mismatches. All normal statue, column and pit rectangles were remeasured against asset crops; variation B's formerly downward-shifted boxes now match the objects, and variation A no longer blocks empty floor below its statue. Normal statues still use full-object hitboxes; the four rare statue variants retain pedestal-only collision and walk-behind rendering. Enable Sprite Bounds to inspect the revised outlines.

## Population cap and continuous despawning
Enemy/NPC population cap is now 400. Before each active-play spawn update, cleanup removes living NPCs whose sprite bounds are more than 100px from the gameplay viewport, or whose position is invalid in the current playable map (including obstacles/shore/walls). Map changes update the camera and run the same cleanup immediately against the destination map. Distance is measured from sprite edges, preserving the existing 100px-offscreen spawn entrances. Cleanup frees slots before spawn batches and does not grant kills, EXP, credits, notes or death effects. Players and collected/ground loot are not part of the NPC population cleanup. Pause freezes active cleanup with the rest of gameplay. Tune limit/despawnDistance in enemyPopulationSettings in world-state.js. The separate 50-visible crowd threshold and 1/s throttle remain unchanged.

## Population pressure, protected bosses and drop lifetime
At 90% of the 400 population cap (360 living NPCs), cleanup sorts non-boss enemies by distance from the player, removing the farthest until total population reaches 70% (280). Bosses remain counted but cannot be removed; if protected bosses alone exceed the target, they are retained. Cleanup still removes distant/invalid regular enemies and never grants kills, loot or death effects. Both Iroha and Shiroko carry explicit boss flags; elite size does not imply boss identity.

Bosses are now exempt from all automatic population/distance/play-area despawning, including map changes. When a chasing AI boss is more than 150px from the visible viewport (measured from sprite edges), it receives catch-up speed greater than current player movement speed. Boost lasts until the boss re-enters view, avoiding repeated threshold toggling. Speed is max(2x boss base speed, 1.35x current player speed +60px/s), accounting for SPD bonuses. Normal player speed240 yields384px/s catch-up. AI-off, wander/idle and paused movement remain under developer control. Edit bossCatchupSettings in boss-catchup.js.

Ground items/reports are entirely outside population/distance cleanup and persist offscreen during active play. Switching maps clears all uncollected drops (including airborne/attracted ones); collected credits/notes/EXP remain. Explicit admin clear and starting a new run still work. This supersedes previous shared-across-maps drop persistence notes.

## Admin seed 0 tile gallery and enemy prop traversal
Admin Seed 0 (Tile Preview) starts a fresh run at movement.html?seed=0. It bypasses weighted/pity generation to place every tile next to the others: Stage 1 mirrors its complete ordered horizontal catalog around column0; Stage 2 mirrors its ordered vertical catalog around row0; Stage 3 repeats all twelve variants in a compact 4x3 grid. Stage 4 remains its single island image. New Game (New Seed) removes the override and returns to time-based random generation. Reset Scene retains seed0. This stays inside the existing admin authentication gate.

All spawned enemies, including bosses/elites, can now walk and recoil through map props. NPC placement and cleanup ignore props too, so crossing an obstacle does not silently despawn an enemy. Player-controlled characters keep normal prop collision. Strip-map physical edges and Stage 4 shoreline containment still apply to enemies; only internal obstacles are bypassed. Island collision supports an explicit ignoreObstacles flag while retaining shore sliding. Map silhouettes still render foreground objects correctly.

## Kill-based boss spawning and pity
boss-spawner.js maintains an internal boss-charge counter separate from HUD total kills. Each real enemy defeat while no boss was alive adds one charge. Starting at charge1000, each eligible kill rolls a 0.01% chance. The chance stays at that value through2500, then rises linearly toward100% at3000. A successful roll queues a randomly selected Iroha or Shiroko chasing boss at a valid offscreen entrance. Placement retries once per second if no location/slot is currently available; pending progress is not lost. Boss spawning is updated before ordinary spawn batches.

Any successful boss spawn, including manual admin spawns, resets the internal charge to0. Charge never accumulates while any boss lives, including the kill that defeats that boss. Cleanup/admin deletion grants no charge. This freeze also applies in endless mode, per user clarification. Before endless, all spawn paths enforce one living boss. In the development cycle, advancing from Stage4 back to Stage1 marks endless mode, where manual multi-boss tests are allowed; automatic progression still waits for all bosses to die. New Game resets the mode/counter. The playtesting sidebar shows charge, chance, pending state and boss-alive freeze. No boss spawn changes the HUD's lifetime kill total.

Tune bossSpawnSettings (1000 unlock,0.0001 base probability,2500 pity start,3000 guarantee) in boss-spawner.js. Boss HP/combat behavior retains its existing development settings. The standard pause freezes this system with all gameplay.

## Stage 1 boss and current HP balance
Stage 1 automatic boss selection is now always Shiroko. Basic Mob HP is60, Elite Mob remains5x at300 HP, and Shiroko HP is100x basic Mob at6000. Shiroko contact damage is explicitly10 HP, independent of the general NPC contact-damage test setting. enemy-variants.js exposes mobBaseHp and shirokoBossStats for tuning. Other stages keep the existing test boss roster until their bosses are assigned; Iroha balance is unchanged. Internal boss-charge/pity timing, cleanup protection and catch-up behavior remain active.

Development update: boss waves, spawn pressure and testing controls
- Endless waves currently use Shiroko and Iroha, one of each maximum. A third slot unlocks after 5,000 endless kills, but remains unfilled until a third boss is defined. Boss charge freezes while any boss survives; queued placement retries cannot create duplicates.
- Elite Mob now has 600 HP (10x the normal Mob's 60 HP).
- Bosses render after map occlusion, ordinary enemies and the player, keeping them above map and enemy artwork.
- Regular enemy spawn attempts have an 85% chance to prioritize the legal entrance opposite the nearest boss relative to the player. Invalid entrances fall back to other sides.
- Playtesting sidebar is 240px wide with stable button/status space. Longer explanations and seed/wave details live in the scrollable, collapsed "Show more" section.
- Stage 3 grand shrine and lantern stage collisions now use multiple fitted rectangular bands, covering the artwork while releasing the empty corners. Coordinates remain editable in tile-world.js.
- Verification: JavaScript syntax and mocked behavior tests passed for HP, distinct boss waves, charge freezing, endless counters, entrance selection and sidebar structure. Original rare-map images were inspected; browser playtesting remains to be done.

Boss EXP burst: bosses drop at least 50 reports, sharing a random total worth 0.8-1.5 times the active player's current full level requirement (minimum 50 EXP to keep each report positive). Reports burst across evenly spaced angular sectors with jitter, 100-230px outward. Tunable values: bossExpRewards in exp-drops.js. Normal and elite rewards remain unchanged. Syntax and behavior checks passed for levels1/2/20/100/1000, reward endpoints, report totals and full-circle coverage.

Standard Mob EXP now equals Math.round(3 + active player level / 2). Examples: LV1=4, LV10=8, LV100=53. Report artwork follows reward value. Elite/boss rewards and explicit admin overrides remain unchanged. Syntax and behavior checks passed.

Standard Mob reward clarification: EXP = Math.round(3 + player level / 2 + report tier). Tier is selected before calculating EXP and artwork retains that selected tier. Existing standard Mob distribution stays90% Report0 /10% Report1; helper supports all tiers0-3. Elite and boss rewards unchanged.

Formula correction (supersedes previous standard Mob formulas): Math.round(3 + playerLevel / (2 + reportTier)). Parentheses place report tier in the divisor. At LV20, tiers0/1/2/3 award13/10/8/7 EXP respectively. Drop probabilities remain unchanged. Syntax and behavior checks passed for all tiers and actual standard Mob drops.

Shield and stable HUD: the HP-number grid column now reserves100px so changing bitmap digit widths cannot resize the health bar or six-slot rows. Shield starts0, capacity equals maxHP, and its cyan hp-shield-fill-overlay.png artwork covers shield/maxHP of the existing HP bar. Damage consumes shield before HP, including spillover; level-up heals HP without replenishing shield. Admin Player EXP/HP panel has Shield amount(default40), Add shield, Remove shield and Clear shield. Reset clears shield. Syntax and behavior tests passed; browser visual verification pending.

Adaptive spawn rate: each second, count enemies within400px of player and interpolate rounded rate from8/s(empty) to5/s(40+nearby). Existing50-visible threshold still slows to1/s. Arrivals6-8 prioritize least-crowded legal direction using updated enemy positions after each spawn, overriding boss-side bias for those bonus arrivals. Base5 retain boss-pressure behavior. Settings editable in playtestSpawnSettings. Syntax and mocked behavior tests passed for density rates, slowdown, bonus direction and batch counts.

Actor scale reduced20%: normal players/enemies89.6px, bosses179.2px, elite Mob134.4px. Shared display padding5.6px and Iroha chase alignment-20px scale with actors. Combat hitboxes already scale by sprite size. Maps, HUD and movement speed unchanged. Preserve new fixed actor sizes on migration. Syntax and sizing checks passed.

Offscreen entrances update: Stage1 may spawn above/below the viewport when the finite map edge is hidden with enough clearance for a full sprite. Stage2 similarly permits left/right; long-axis entrances remain available. Direction ranking now uses currently legal entrances instead of map axis alone. Automatic NPC/boss placement no longer clamps the short axis into the viewport. Stage4 uses four-sided offscreen attempts with existing island-shoreline validation rejecting water. Bosses use their larger radius. Physical map placement validation remains authoritative, including elite sizes. Syntax and mocked entrance tests passed; browser playtest pending.

Base spawn distribution update (supersedes boss-opposite bias): the first five arrivals per second balance successful spawns across currently legal offscreen entrances. Counts carry between batches, randomizing ties so the fifth arrival rotates over time. Blocked entrances fall back to other valid directions. Bonus arrivals6-8 still favor the side with fewest current enemies;50-visible slowdown retained. Syntax and consecutive-batch tests passed for four-sided/two-sided maps.

Spawn stream update (supersedes even-base distribution): all regular arrivals now have90% priority for a least-populated legal direction, with10% random entrance variety. Counts refresh for each arrival; a left-side horde shifts pressure toward top/bottom/right where legal. Adaptive5-8/s and50-visible1/s slowdown remain. Spawn credit emits individuals with +/-15% interval jitter and at most one arrival per frame; long frame stalls discard backlog instead of creating waves. Direction/interval settings are in playtestSpawnSettings. Syntax and simulated60FPS tests passed for80arrivals/10seconds, unique spawn frames, avoiding left horde, three other directions and no stall burst.

Shield white edge: shield now has the same2px bright leading edge and200ms position transition as EXP, aligned to its cyan fill boundary. Hidden at0shield, constrained to the fill interior, with reduced-motion support. Regular HP has no marker. Syntax and structural/alignment checks passed; browser visual test pending.

1HP enemy test config: NPC admin tools now include an unchecked-by-default "all enemies have1HP" toggle. It applies to existing and future enemies, including elites and bosses, and sets both current/maxHP to1 so admin healing retains the test. Disabling restores saved health for surviving enemies. Session-only; player health and rewards unaffected. Syntax and state tests passed for existing/future enemies, record updates and restoration.

Development defaults update: no seed parameter now selects admin seed0 (tile gallery +1HP for all enemies including bosses). Enemy1HP indicator is read-only and follows seed selection rather than a separate toggle. Reroll seed/new game sets?seed=random and reloads into a local-time/entropy seed with normal enemy HP; Admin seed0 button returns to test configuration. Random spawning startsOFF on all Development runs, including rerolls; Start enables the existing adaptive stream. Syntax and behavior tests passed for default/admin/random seed selection, enemy health and stopped/started spawning.

Sprite folder references updated: umbrella source/HUD icon now use sprites/attacks/plana umbrella.png; Mob uses sprites/enemies/normal/Mob Sprite Sheet.png; Shiroko/Iroha use sprites/enemies/bosses. Updated Shiroko decoded-frame source comment. Existing elite Mob continues sharing the normal artwork: both normal/elite files currently have identical SHA256 content. No animation crops changed and Arisu remains unconfigured. Syntax passed;59literal/map asset references resolve and all4report icons exist.

Actor sizing update: bosses enlarged50% from179.2 to268.8px; elites enlarged20% from134.4 to161.28px (1.8x normal). Normal player/Mob stays89.6px. Combat hitboxes and boss offscreen spawn radius derive automatically from display size. Iroha barrel chase offset scales-20 to-30px. HP and damage retained. Syntax/sizing checks passed.

Safe loot landing: EXP reports, credits, notes and admin test drops validate a32px ground clearance against active map boundaries/player obstacle geometry, including island shoreline/pond/buildings. Invalid scatter targets search nearby clear ground; enemy obstacle bypass does not apply to loot. If no safe landing is found, preserve hidden pending loot and retry rather than dropping it outside the map or losing rewards. Boss radial targets are checked after their full-circle overrides. Boss EXP burst distances reduced8%:92-211.6px. Airborne scatter still animates before landing/pickup. Syntax and behavior tests passed for all loot kinds, boss burst, blocked/out-of-bounds origins, pending retries and real island geometry.

Yuuka credit enemy: manually available in NPC sprite selector; no automatic encounter odds assigned yet. Uses sprites/enemies/special/100kg thighs.gif, decoded to399display-sized frames preserving source timing (max160px to control texture memory). Runs336px/s (140% of base player240) with heading changes every0.12-0.35seconds, steering back toward player beyond500px. SpawnHP=round((normal player attack damage+100)/100*900), including ATK bonus but not random critical rolls. Current23damage=>1107HP;250=>3150. Admin seed0 still overrides to1HP.
Testing reward defaults editable in yuuka.js:1credit per accepted hit including final hit;100additional credits on death. Death scatter is area-distributed throughout1.3x boss max burst radius (275.08px), with full-circle coverage and existing safe-map landing validation. Credits replace reports/ordinary loot for Yuuka. Damage flashes/death effects/kill count use shared systems. Manual AI checkbox still controls whether she moves. Syntax/state tests passed for HP/speed/hit and death loot/radius/heading changes; source GIF frame count and timing verified. Browser playtest pending.

Yuuka sizing/contact update: explicit contact damage2; display area is90% of shared boss size, currently241.92px. GIF aspect ratio retained; combat hitbox and foot alignment derive from new size. Syntax and template tests passed.

Central balance/formula configuration: use Development/game-config.js for live edits and Development/FORMULAS.md for correspondence tables, current values, formulas and examples. This supersedes older notes directing edits to scattered balance modules. Configuration covers players/combat, health/sizes, rewards, Yuuka, spawning/boss pity/population, maps/rare weights, sound gains and effect timings. Existing public module exports are retained as re-exports. Source-art geometry/crops remain in their original modules. Save and reload after edits; admin seed0 still forces1HP.
Yuuka now drops elite-equivalent EXP:5reports totaling at least150, with same80/20 initial report rolls/top-up, alongside her credit rewards. Corrected variant contact-damage fallback to preserve Yuuka's explicit2damage. Module graph and behavioral checks passed, including actual Yuuka defeat producing5reports and101credits(final hit+death), baseline formulas and central edits flowing through imported gameplay functions. Browser playtest pending.

Elite EXP update: final combined reward=min(round(old rolled/top-up total*0.4),3*standardMobExp(currentLevel,tier0)). This is60% reduction plus a cap across all reports, not per report. Current pre-reduction floor150 becomes60 before cap; LV1cap12,LV10cap24. Still distributed across5positive reports; artwork reflects final values. Yuuka shares rule. Edit eliteExpRewards.rewardMultiplier/normalCapMultiplier or eliteExpTotalFormula in game-config.js. FORMULAS.md/sidebar updated. Tests passed across levels/rolls including60% reduction and combined cap.

Yuuka automatic spawns: each regular streamed enemy arrival has0.5% base chance to become Yuuka. After any successful Yuuka spawn (manual or automatic), new Yuuka spawns are blocked for100actual kills. Kills since last spawn also drive pity: +1percentage point per completed50kills beyond500 (550=1.5%,600=2.5%), capped100%; first spawn has no initial cooldown. Successful spawn resets both cooldown/pity; invalid placement does not. Counter runs independently of boss charge and persists across map switches. Live chance/cooldown appears under Show more. Settings/formula in game-config.js; FORMULAS.md updated. Default Development random spawning remainsoff. Syntax, module linkage and probability/cooldown tests passed.

Yuuka chance cap update: maxChance0.05 (5%) in yuukaSpawnSettings; pity reaches cap at750kills. Cooldown/basechance unchanged. Guide updated; boundary tests passed.

Yuuka movement/escape update: speed=2x base player=480px/s. During first30simulation seconds she cannot move more than300px beyond viewport, measured from sprite edges, including corners; reaching limit turns her inward. After30seconds each outward crossing beyond100px offscreen rolls10%despawn. Staying outside does not reroll every frame; return within100px rearms. Generic100px offscreen cleanup and population trimming exclude Yuuka, preserving this rule; invalid-map cleanup still applies. Escape grants no loot/kills and does not reset spawn cooldown. Settings in game-config.js under yuukaSettings. Actual module tests passed for speed, initial protection, corner limits, crossing/rearm and cleanup exception.

Special enemy priority: normal actors/map render first, specials next, bosses last; specials and bosses bypass map foreground occlusion, with Y sorting within each layer. Shared enemyRenderLayer classifies explicit special flags/Yuuka while boss identity always wins. During any live boss, automatic special spawn odds multiply0.2 (80%reduction). Yuuka0.5%base->0.1%;5%cap->1%; kill cooldown/pity still operate and restore full odds once bosses are gone. Editable specialEnemySettings.bossSpawnMultiplier in game-config.js. Admin Yuuka status reports effective odds. Tests passed for layers, probability/cooldown, syntax and actual module dependency evaluation; browser visual check pending.

Admin Yuuka spawning fix: manual NPC spawn controls bypass Yuuka's100kill cooldown, allowing multiple test instances up to population cap. Automatic spawns still enforce cooldown/pity; each successful manual spawn resets automatic cooldown/pity. Guide updated. Syntax/guard behavior checks passed.

Yuuka facing fix: sourceGIF native direction isright. Template startsright and declares nativeFacing:right; GIF renderer mirrors only when rendered facing differs from native direction. Existing Shiroko defaultsleft asbefore. Syntax/facing tests passed.

Alternate audio: Audio:Default/Secondary toggle now sits beside top volume slider. Secondary bank maps Stage1-4 to Audio/alt music/Playarea1-3 and playarea4 tracks; secretarea is unassigned. Switching banks crossfades using existing900ms fade and gain scales, unloads inactive long tracks, preserves volume/music pause, and retains selected bank on stage changes. Default bank remains initial selection. Mocked media tests passed for both banks, stage changes, old-track shutdown and all4alternate files.

Stage1 window boundary correction: upper playing bound moved down by70source-image pixels scaled with enlarged background. Shared strip bounds apply this to player movement,NPC placement/recoil and loot landing/spawn entrances. Bottom and Stage2 bounds unchanged. Edit officeWindowInsetSource in game-config.js;higher moves boundary down. Source map inspected; scaling tests passed; visual playtest pending.

Yuuka repeated-contact balance: each Yuuka has1.5second player-hit cooldown after accepted damage (including shield damage), separate from global0.2s I-frames and recoil timers. Other enemies retain existing damage timing. Edit yuukaSettings.contactHitInterval in game-config.js. Guide updated. Tests passed for lockout/expiry,double contact checks,Mob timing and blocked-hit behavior.

Yuuka hit cooldown increased to3seconds (yuukaSettings.contactHitInterval), superseding1.5seconds. Formula guide updated; configuration check passed.

Player Z priority: controlled player now renders after bosses, with attack effects after player. Enemy order remains normal->special->boss. Guide updated; render-order/syntax checks passed.

Foreground player visibility: Stage1monument,Stage2statues andStage4tower now composite covering foreground artwork at50%opacity over the player overlap region. Only the controlled player's occlusion uses transparency; NPC masks remainopaque,collision unchanged. Edit obstacleVisibility.playerOpacity in game-config.js (0transparent,1opaque). Mockedcanvas checks passed for all3mask types and alpha restoration; allJS parsed. Browservisualcheckpending.

Yuuka initial/unique spawn fix: no automatic chance before100kills (`yuukaSpawnSettings.unlockKills`), rather than0.5%fromrunstart. One livingYuuka maximum, enforced in sharedmanual/automaticspawn path and automaticarrival chooser. Manualspawn bypasseskillgate for testing but cannot create duplicates. Existing100killpostspawncooldown,pity andboss-reductionremain. Adminchance shows0whileYuukaalive. Guideupdated; boundary/state/guard/syntaxchecks passed.

Yuuka admin exception: admin/manual spawn now bypasses both unique-active limit and kill/cooldown gates. Automaticspawns remainblocked before100kills,duringcooldown,orwhileanyYuukaisalive(includingmanualones). Guideupdated;guard/syntaxcheckspassed.

Player EXP/HP tools now use a native collapsed details/summary dropdown, matching other admin panels. Toolbar EXP/HP shortcut toggles its open state; aria-expanded stays synced when summary is clicked. Controls/IDs preserved. Structural/interaction/syntax checks passed.

Spawn spread correction: strip-map enemy density now uses actual directional projection instead of assigning everyStage1enemy toleft/right or everyStage2enemy totop/bottom. Previously this made short-axis entrances look perpetuallyempty. Default playtestSpawnSettings.distribution='balanced' now balances successful arrivals across all currentlylegaledges; density breaks ties. Resets balancing when usableedge set/map changes, validates placement/fallsback whenblocked. Optional'leastCrowded' retainsdensitymode withcorrectedcounts. Staggered5-8/s andvisible-crowdslowdownunchanged. Tests passed for2/3/4edge equaldistribution, bottomhordecounting and8/sindividualstream.

Yuuka odds halved: base0.25%,pitystep+0.5percentagepoints/50kills after500,cap2.5%. Activeboss20%multiplier stillapplies(effectivebase0.05%,cap0.5%).100killunlock/cooldown/uniqueautomaticlimit/adminbypassunchanged. Enemycombat/contacthitboxradii reduced10% via combatBalance.enemyHitboxScale0.9; appliesallNPCtypes/elite/boss/special/customprofiles. Playerhitbox unchanged, includingcontrolledtestavatars. Attack/contact/debugboundsusethe samereducedbody;sourceart/mapcollisionunchanged. Formula guideupdated;chanceandhitboxtestspassed.

Survival timer/HP scaling: compact MM:SS bitmap timer follows beneath active player's center, stays within viewport, pauses with globalpause and stops onactualdeath (invincibility continues). Runstartclock persists acrossmaps/avatar swaps/reset-scene; reroll/newgame resets byreload. New basicMob HP=round(60+(350-60)*(seconds/900)^1):0min60,5min157,10min253,15min350; continuesgrowinglater. Elites retain10xscaledMobHP; existingenemies keep spawnHP. Boss/Yuuka formulas unchanged; adminseed0still1HP. Editable mobHealthScaling/basicMobHpFormula andsurvivalTimerSettings in game-config.js. Guideupdated. Unit/syntax/modulelinkchecks passed; browservisualcheckpending.

Boss pity nowstarts1500kills(previous2500). Unlock1000/base0.01% andguarantee3000unchanged;linearpityspan1500->3000. Formula guideupdated;boundarycheckspassed.

Timed boss pity: at900active survival seconds, boss unlock/pity thresholds become500kills and guarantee1500; before15min existingunlock1000/pity1500/guarantee3000 retained. Currentchargepreserved; crossing15minwith>=1500charge queuesguaranteeonnextavailableattemptwithoutrequiringextrakill. Bossalive/wavequeuefreeze stillapplies. Adminstatus showsactiveguarantee/pity. Editablelate*fields in bossSpawnSettings. Guideupdated;boundary/freeze/immediateguaranteetests passed.

Boss latepity revision: reduced500/1500thresholds nowactivate5active minutes afterStage4completion/enteringendless,not15totalminutes. Existingdevelopmentcompletionmarker isfirstStage4->Stage1wrap; timestamprecordedonce. Latermapcyclesdo notresetit. Pausesexcluded bysurvivalclock. Earlierthresholds remainunlock1000/pity1500/guarantee3000,storedchargepreserved. EditbossSpawnSettings.lateEndlessSeconds300. Guideupdated;null/299/300secondandpreserved-charge tests passed.

Endless elite escalation: randomMob spawns retain1%elite through5active endless minutes, then linearly ramp to80%at10minutes, remaining80%later. At7.5minutes40.5%. Uses Stage4completion/endless elapsedclock,not totalrun time; latermapchanges do notreset. ManualNormal/Eliteforcechoicesstilloverride;bosses/Yuukaexcluded. EditendlessEliteSettings/eliteChanceFormula in game-config.js. Guideupdated;timeboundary/varianttests andsyntax passed.

Endless bossbuildup nowrepeatable:5minutesnormal,5minramp to100%eliteMob/10spawnspersecond,3minconstantelitehold. Progressonlywhileautomaticspawningrunsandnobossalive(globalpausealsofreezes). Atcompletionalleligibleactiveelitesdefeatedwithnormalrewards/effects,thenexistinguniquebosswaverequested. Randomspawnsimmediatelyreturnnormal5-8/sandbase1%elite;normal/specialenemiesnotcleared. Bossalive resetsbuildup;nextcyclebeginsafterwaveends. Endlessnaturalpitywavesdeferreduntilcyclecompletes;manualboss caninterrupt. ConfigendlessEliteSettings updated;guide/statusadded. State/ESmoduleintegrationtests passed,includingclear-before-boss,two-unique-bosswave,andnormalenemypreservation.Browserplaytestpending.

Elite surge reclassified as an endless EVENT: registered eliteSurge in endless-events.js, enabled via endlessEventSettings.enabledEvents in centralconfig. Registry/controllerwrap allowsfuturedefinedevents withoutembedding elitepatternasgeneralendlessbehavior. CurrentlyonlyEliteSurge exists,so timing/mechanicsunchanged. Eventselectedafterbosswave;emptypoolrestoresordinarykill-pitybossbehavior. Adminstatusshowseventname. Guideupdated;registry/lifecycle/disabledpooltests passed.

Boss-driven loop: actuallastbossdefeat(withnoqueuedbosses)advancesStage1->2->3->4automatically. CompletingStage4entersendlessandrecordsstarttime;manualmapcyclingnolongerunlocks endless. Endlesswaveclearselectsanotheravailablemaprandomly,avoidingimmediaterepeat. stageProgressionSettings.secretChance0.1 reservedperendlessclear;withoutsecretmap itfallsbacktoexistingregularmap,nosecretassets/stageadded. Existingripple/positions/audio/cleanupreused;pendingmaptransitionwaitsforcurrentripple. Multi-bosswavesmustfullyclear. Guideupdated;campaign/random/secretfallback/waveguards/syntax/modulelinktestspassed. Browserplaytestpending.

Elite size increased10%from161.28to177.408px;eliteSizeMultiplier1.98(198%normal). Combatbodyautomaticallyscales. Guide/sidebarupdated;sizecheckpassed.

Enemy damage scaling added: finaldamage=floor(enemyBaseDamage*variantMultiplier*(1+(currentPlayerLevel/6)*(activeSurvivalMinutes/4))). NormalMobbase1;elite2x,Yuukabase2,Shirokobase10retained. Finalrounddownonly(nointermediaterounding). NPCcontactpassescurrentrunseconds;shields/iframes/Yuuka3scooldownunchanged. EditenemyDamageScaling/enemyContactDamageFormulaingame-config.js. Guideupdated;formula/contact/syntaxtestspassed.

Drawing-skill core implemented (Development only): right-click arena starts8second sketch window,50%dim overlay,directional-aim override,rounded cyan/blue/lilac gradient strokes and lower timer built from mirroredright/middleEXPsegments. Supports multipleleft-clickstrokes;3secondsidleafterrelease submits early;8seconddeadline wins. Priorcrosshair preference restored when overlay closes. No worldpause/skill effect invented.
Recognition: browserWebWorker loads pinnedTransformers.js3.8.1and requested Xenova/quickdraw-mobilevit-small q8WASM. Normalizedsketchonly,notgameimage;explicit1channelgrayscale/inversion andtraining-matched16px modelstroke width for28pxpreprocessing. Modeldownload/cachefirstuse; drawingsstaylocal. Top3predictionsreturned. Network/errors/blank/tinyinputgive no successcooldown;pendingrecognition has120secondtimeout andcancellationtoken guards.
Perweaponcooldowns: recognizedcast180s,rightclickcancel30s,pausecancel60s. Pause hookcancelsdrawing/pendingrecognition;cooldownsfreezeinpause. Graycirclebehindattackiconclearsclockwise. Occupiedattackslotsselectcastweapon;firstequippeddefault. Resultstoredasweapon.lastSkillDrawingandwindow skill-drawing-recognizedevent({player,weapon,predictions})forfutureeffects. Currentprototypeacceptsnonblanktoplabel(minimumConfidence0),skillmapping/effects deferred.
Liveverification: isolatedbrowserfixturetests/skill-preview.html exercisedmodelWASMinference,livegradientstroke/3sidlesubmit/180scooldown,rightclick30s,pause60s. Fixedchannelmismatchfoundinbrowser;matchedQuickDrawpolarity/strokewidth. Labelaccuracynotguaranteed(e.g.generatedcircleclassifiedsoccerball);futureallowedlabelrulesnotdefined. Regressiontests:node Development/tests/skill-casting.test.cjs,passedtiming/multistroke/cancelrace/perweapon/errorcases.GameplayESmodulegraphlinksandworkerparses.Fullauthenticatedgameplaynotbrowser-tested. Temporarybrowser/servercleanedup. Formula guideupdated;alltunablesin skillCastSettings.
Sources:https://huggingface.co/Xenova/quickdraw-mobilevit-small ;https://huggingface.co/Xenova/quickdraw-mobilevit-small/blob/main/preprocessor_config.json ;https://huggingface.co/docs/transformers.js/v3.8.1/en/tutorials/vanilla-js ;https://github.com/googlecreativelab/quickdraw-dataset/issues/19

Plana firstskill: circle enclosing an upperarrow and lowerX now maps to UmbrellaLaunch. Segmentationseparatescurvedringstrokes,propercrossingdiagonalsandshaft/headarrow,checkingcontainmentandlayout,independentofstrokeorder;multi-arccirclesandsymbolsnearouterring supported. EachpartcroppedandclassifiedseparatelybyQuickDraw. ModelhascircleclassbutnoX/arrowlabels;geometryvalidatesthose instead ofinventinglabels. Per-componentpredictionsstored/debuggable;circleconfidenceonlysoftscoreadjustment. Invalid/incomplete/unmappedpatterns no longercompletegenericcast/consume180scooldown. Castfeedbackonscreenadded.
Effect: actual8umbrellaopeningposes,0.22sopening,900px/sforwardflight,max800px,80pxhit-radius;sweptcollision,onehitperenemy. Damage1.5xbaseumbrella throughnormalATK/critformula(default23->35rounded). Survivingenemiesincludingbosses/specialsareknockedsideways180plus45forwardover0.22sandstunned3s. StunblocksAI/attack/contact;mapboundmovementstillapplies. Map/sceneresetsremoveprojectiles;pausesfreezeeffect. TunablesplanaSkillSettings. Aimdirectioncapturedatsubmission;180sskillcooldown/cancelpenaltiesretained.
Verification: skill-castingregressionandnewplana-skilltests passed(patternmissing/reversedparts,reorderedstrokes,splitcircle,scaled/translatedinput,near-edge/sidewaysarrow,threeAIjobs,cancelguards,openingdelay,35damage,sweptonehit,bossstun,knockback/3srecovery,crops). Fullgameplaymodulegraphlinked. IsolatedbrowserranrealQuickDrawthreecomponentrequestsandcompositePASS;visuallyconfirmedopenumbrellaand965HP/3sstuntargetafterlaunch. Noauthenticatedgamepageplaytest. Guideupdated. Sources:modelclasslist https://huggingface.co/Xenova/quickdraw-mobilevit-small/blob/main/config.json

Survival timer: fixed at the top center below the EXP bar; adjust survivalTimerSettings.offsetBelowExp for its gap. It stays in place as the player and camera move.

Drawing skill timing: 5-second total drawing window, with early submission after 2 seconds without a new stroke. Configured in skillCastSettings.

EX Skills pause tab: shows the defined Plana Umbrella Launch casting diagram (circle with an upper arrow and lower X), equipped status, short effects, and live configured timing/damage multiplier/stun values. Character and EX Skills tabs support arrow-key navigation; browsing keeps gameplay paused. Undefined weapon skills are not invented.

EX Skills reference update: independent pause-menu button opens a dedicated screen with a weapon dropdown, centered weapon name, casting diagram on the left, and transparent weapon icon above the effect description on the right. Back returns to pause menu without resuming. Currently lists Plana’s Umbrella, the sole defined weapon EX Skill.

CLIP + QuickDraw casting: CLIP evaluates the whole symbol against missing/reversed/scribble alternatives, QuickDraw evaluates its parts, and forgiving spatial/reference checks keep the intended circle/upper arrow/lower X pattern. Accuracy is measured against the reference independently of model confidence. Successful damage scales 1.2x–2x with 1.5x at the typical accuracy anchor; edit skillCastSettings in game-config.js. First use downloads CLIP weights; inference remains local. EX reference/onscreen cast feedback reflect the multiplier. Real browser combined inference verified; thresholds should be tuned with player sketches.

Umbrella presentation update: drawing idle completion is now1.5seconds (total window still5seconds). EX umbrella fades in while opening for0.28s, holds0.08s then flies at3600px/s with densely sampled blurred afterimages and a soft streak. Display length128px is20% smaller. Trail lasts0.20s and cleans up automatically; range, damage and stun unchanged. Edit skillCastSettings.idleSubmitSeconds and planaSkillSettings visual values.

EX Skills copy: show weapon-specific effect and pattern only. General casting controls, drawing/idle timing, cooldown explanation and accuracy-based damage rules belong in the future How to Play view accessible from pause/main menus. How to Play is not implemented yet.

Midori invasion: after an Elite Surge clears, a configurable50% outcome starts180active-spawning seconds of Midori-only arrivals instead of a boss. HP/contact damage and loot follow elite rules; movement follows90% of current player speed including SPD upgrades. Nearby player attacks (within160px) have20% chance to MISS, without damage/flash/stun. Admin damage bypasses dodge. All settings are in midoriSettings/endlessEventSettings. Admin Playtesting > Event testing starts elite/Midori events immediately or stops the stream; individual Midori spawn is also in NPC tools. Admin seed0 still means1HP. Midori GIF decoded into398display-sized timed frames.

Midori combat hitbox: small foot-level ellipse, rx=0.13, ry=0.075, y=0.36 of sprite size before the shared enemy radius scale. At89.6px size, approximately21px wide by12px tall. Shared by player contact and weapon hit detection; edit combatHitboxes.midori in combat-hitboxes.js.

Midori display size now matches Yuuka (bossSpriteSize * yuukaSettings.sizeRatio). Its combat ellipse retains the previous approximately21x12px dimensions via radiusSize and anchors to the rendered feet rather than scaling with the larger art.

Midori speed reduced by5% relative to previous value: speedRatio0.9 *0.95 =0.855 of current player speed. At base240px/s, Midori now205.2px/s; SPD upgrades still apply.

Midori close-range evasion chance is now5% (midoriSettings.missChance=0.05). MISS popup text is white; existing bounce/fade animation retained.

Yuuka/Midori animation speed is now1.5x, editable in specialEnemyAnimationSettings. While moving, the automatic spawn stream caps forward-edge arrivals at3/s; overflow comes from perpendicular edges. Diagonal running uses the dominant axis. If perpendicular edges are blocked by map bounds, rear-edge arrivals are used instead; forward-only entrances throttle. Stationary distribution, total adaptive rate, encounter rarity and movement speeds are unchanged. Setting: playtestSpawnSettings.forwardPerSecond.

Midori speed reduced another5%, now81.225% of current player speed (194.94px/s at base240). Chase compensates for foot-hitbox offset so the feet move toward the player’s combat center rather than stopping at sprite-anchor overlap; small collision dimensions retained.

Midori and Yuuka animation playback is now3x source GIF speed via specialEnemyAnimationSettings; movement speed is unchanged.

On-screen spawning cap uses weighted slots: each elite consumes3, all other enemies1, offscreen enemies0. At50slots, arrivals slow to1/s including event streams. Admin status displays both weighted slots and actual visible headcount. Global400enemy population still counts individual enemies. Edit playtestSpawnSettings.eliteVisibleSlots.

Failed skill casts now automatically start failureCooldown (default180s), including invalid symbols, recognition errors and empty attempts. Overlay closes/restores aiming without another right-click. Right-click/pause cancellation retains30s/60s penalties. Cooldown circle diameter reduced2px.

Casting fix: removed raw48px size/aspect limits and raw12px ink-length cutoff. Independently normalizedX/Y makes small/large/squashed versions behave consistently in parsing, model inputs and accuracy damage. Circle-arrow-X order is supported. Empty/incorrect patterns still fail;1.5s idle completion and5s total drawing window remain.

Right-click cast availability checks all equipped skills: selected ready weapon first, another ready weapon next, then optional future ultimateSkill. Each skill owns its cooldown; only all-cooling or empty loadouts block opening. Automatic fallback updates selected weapon. Optional ultimate timers tick independently without adding an ultimate ability yet. Right-click during an active drawing still cancels per existing rules.

Correction: no weapon switching or selected skill slot is used. Every equipped weapon continues its autoattack. Right-click opens the shared drawing surface if any skill is ready; the pattern is compared against ready equipped skills and activates/cools down the matching one. HUD weapon slots are display-only and no selection highlight remains. Future ultimate participates in readiness/matching once defined. Failed unmatched attempts retain the existing automatic failure cooldown on the first ready skill used to begin the attempt.

Umbrella EX targeting fix: launch uses the same aiming.getAngle as the arrow/autoattack, including cursor aim and camera offset. Restored aiming is read after recognition. During opening the umbrella follows the live arrow; the projectile locks its direction at release and travels straight.

Admin skill tools are on the left outside the game screen: Reset cooldowns clears all character weapon/ultimate timers and cancels pending recognition; Cast1-6 directly triggers the defined attack-slot EX effect, bypassing cooldown. Draw numbers1-6 checkbox enables local handwritten digit matching after right-click drawing, also bypassing cooldown and AI downloads. Skill slots remain equipped/autoattacking; numbers do not switch weapons. Empty/undefined EX slots are disabled; currently only Plana Umbrella slot1 is implemented. Successful admin casts use typical1.5x damage and restart normal cooldown, which can be reset/bypassed again. Pause disables the testing controls. At wide fullscreen previews the left tools remain outside the1280x720screen.

Admin Skills panel widened160->220px (including wide fullscreen), with minmax(0,1fr) tracks and smaller button horizontal padding to prevent intrinsic grid/button overflow. Narrow layouts retain responsive stacking.

EX Skills presentation: panel background now uses a translucent blue gradient with lighter surrounding dimmer. Native select replaced by one-click weapon dividers (details/summary); opening one collapses the others, and another click closes it. EX text uses sprites/font-thin.png, generated from the supplied sheet with connected-stroke thinning and tight font-thin-metrics.js. Source font.png unchanged. Rebuild using python Development/tools/build-thin-font.py. Bitmap renderer supports optional thin variant and responsive wrapped paragraphs; existing HUD retains regular font. Isolated preview: Development/tests/ex-skills-preview.html.

Umbrella EX now renders before the player, including its opening and trail. Visual length115.2px is10% smaller than128px. Travel speed2520px/s is30% lower than3600 and remains fixed, independent of SPD/Haste or other player stats.

Umbrella EX knockback reduced60%: knockbackDistance180->72px. Forward component remains25% of that distance (18px); stun/recovery timing unchanged.

Umbrella aim now locks at the end of opening/fade-in (0.28s), before the brief0.08s open-pose hold. Targeting changes during the hold or flight do not change the launch angle.

Pause menu: Resume is first action. Right-click backs out of EX Skills or closes Settings, then resumes from root; browser context menu is suppressed. Guest confirmation also right-click cancels. EX Skills uses the user-supplied sprites/font2.png with independently measured uppercase/lowercase glyphs in font2-metrics.js; regular HUD font unchanged. The earlier generated thin font is no longer used by EX Skills.

Menu font alignment update: EX body font2 glyphs use corrected common uppercase/lowercase baselines. EX Skills/weapon headings never wrap; all bitmap menu labels share1.5x scale and36px line boxes. Pause action buttons (including Resume/EX Skills/Settings/Exit/Dev Lab) and EX Back use supplied font2.1.png with dedicated font21-metrics.js; paragraphs retain font2 with wrapping. Original HUD font unchanged.

Drawing overlay aiming: when idle between strokes, keep the user's cursor-aim preference and track pointer through the overlay. Holding left-click to draw temporarily forces facing; release restores cursor targeting without toggling the selected aim mode. Closing/cancelling also clears the override.

Menu font choice reverted to sprites/font.png for all EX Skills text and pause-menu buttons formerly using font2/font2.1. Single-line titles, wrapping behavior, shared scale and menu controls retained. Alternate source sheets remain available but are no longer used by these views.

Crowded spawn rate is now2.5/s at or above50visible slots, configured by playtestSpawnSettings.crowdedPerSecond. Elite weighting and overall population cap unchanged.

Crowded spawning lowered2.5->2/s. Added Event testing > End event (no drops). Event-instance tags scope normal death animation cleanup to that encounter on manual/natural ending; no loot, kill count or defeat/pity notifications. Unrelated enemies and bosses remain. Elite transition cleanup now uses the same no-reward path. Stop event cleans and pauses; End event leaves ordinary spawning running.

Event-end death remnants now glow/fade in place with knockback disabled. Normal combat deaths retain their existing launch-back animation. No-drop/no-kill-count rules unchanged.

Combat hitboxes: all enemy radii now scale0.81 (another10% shrink from0.9). Player body is a circle centered at sprite/world anchor: ry=rx, offsetY=0, preserving previous half-width. Plana radius24.192px, Arona22.4px at normal89.6size. Enemy foot anchors remain intact.

Plana’s player combat circle is shifted6px downward via combatHitboxes.plana.playerOffsetY, preserving its radius. Other characters and NPC versions unchanged.

Plana’s player hitbox radius reduced10% via playerRadiusScale0.9 (24.192->21.7728px). Its6px downward offset and circular shape remain; NPC Plana unchanged.

Plana player hitbox reduced another20%: playerRadiusScale0.9*0.8=0.72. Radius17.41824px at current sprite size; center offset unchanged.

Pause and EX Skills now use the updated300x160 sprites/font2.png throughout, including Resume/buttons, PAUSED title, character name and stats. Font2 metrics rebuilt from20px source cells; source scale/line height corrected for the smaller replacement sheet. Single-line headings and paragraph wrapping retained.

Drawing cursor now uses sprites/pen.png, rendered into a48px native cursor with hotspot at pen tip. While actively drawing it replaces the generic crosshair; idle cursor-aim mode retains the existing targeting sprite. Facing-aim idle mode shows the pen ready to draw.

Sweepers: White Sweeper and Heavy Sweeper added as standard enemies with5frame/8direction sheets. Base spriteSize=normalSpriteSize*0.8=71.68px; referenceSize160fits visible robot artwork. Standard HP/time/contact/EXP rules match Mob. Both support normal elite rolls/admin elite spawn; elite size also stays80% of corresponding elite Mob. HeavySweeper asset is in elite folder but treated as standard per request. Spawn pool weights editable in standardEnemyWeights: Mob70,White15,Heavy15. Admin NPC dropdown includes both. Crops/direction layout in sweeper-sprites.js.

Level-up menu: gameplay pauses for every earned level, queues overflow choices, shows character/HP/stat summary on the left and4card positions on the right, using font2. Only Plana's Umbrella is implemented, so exactly1next-upgrade card is offered;3slots stay empty. KeyboardUp/Down/Enter or click chooses. All gameplay timers/spawning/combat/cooldowns freeze; music continues. At no available upgrades, Continue resumes without inventing filler stat upgrades. Pausing cannot dismiss an unspent choice.

Umbrella progression: LV2 +30%base damage, LV3 +20%area, LV4 interval*0.9, LV5 another+30%base damage, LV6 another+20%area, LV7 guaranteed crit with3x multiplier. Damage bonuses additive=>1.6base, area bonuses additive=>1.4area (linear reach uses sqrt1.4). Haste still applies separately. EX damage inherits weapon damage/critical upgrades while retaining fixed projectile speed. Awakening is separate AFTERLV7, costs1collectedSecretTechNote and keeps level7; offered at a subsequent level-up when a note is available. Awakened HUD icon has gold outline/sparkles; world autoattack has gold glow. No extra undefined awakening damage bonus added. Settings: umbrellaUpgradeSettings. Shared inventory spending is atomic. User-edited EXP settings (currently80initial) preserved.

Aris's Laser added using sprites/attacks/Weapon_Icon_Arisu.png. Acquired as NEW weapon in level-up choices or via left admin Equip Aris laser button; all equipped autoattacks run together. Base damage is300%of9-11 =>27-33, before ATK/critical rolls. Fires a1second piercing beam every3seconds, no target limit,1second per-enemy hit cooldown shared across overlapping volleys. Base width32px, range2000px; visuals cyan/white laser with weapon artwork at origin. Aim locks per volley and origin follows player. Knockback10frames/60=0.1667s; speed15px/frame*60=900px/s =>150px displacement. Pause freezes attack.

Aris levels:2size+30%,3interval-0.5s,4damage+50%,5interval-0.5s,6sizeadditional+50%,7additional rear beam. Final width1.8x; final interval2seconds before Haste. Max7. Separate note-gated awakening follows existing weapon rule and uses HUD gold/sparkles. No Aris EX skill/pattern has been defined, so it does not participate in right-click readiness/admin EX number casts yet. Settings in arisWeaponSettings; fixture Development/tests/aris-preview.html.

Umbrella base stats updated: nominal120%of10=12damage with supplied10-14variation,1.5sattackinterval,1swing,unlimitedtargets,0.5sper-enemyhitcooldown and100%basearea (existing190degreearc/176pxreach). Swing duration remains0.2s. Existing levels apply to new base (LV4interval1.35sbeforeHaste;LV7guaranteed3xcritical damage). EX now samples the revised umbrella base damage while retaining its own accuracy multiplier/fixed speed. Edit umbrellaSettings.

Shared knockback system: living enemy effects travel at fixed direction/speed for duration. Enemy collisions stop displacement for both knocked actors; solid props/map bounds stop it immediately without sliding. Ordinary enemy walking still crosses props. Contacts, PlanaEX and Aris use the same resistance/movement path. Knockback speed scales by1-currentResistance, then each accepted knockback adds10percentagepoints for subsequent hits, capped90%. Bonus resets after10gameplayseconds without another knockback; optional baseKnockbackResistance remains. Enemy knockbackImmune blocks all displacement even if attack ignoreKnockbackResistance=true. Immunity does not cancel a separately specified stun. Default enemies start with0resistance, no immunity. Death launch visuals remain cosmetic; event-end deaths still have no knockback. Settings in knockbackSettings and per-attack ignoreKnockbackResistance fields.

Damage calculation now shares game-config.js damageRules/attackDamageFormula across Umbrella, Aris and EX hits: weapon factor * 10 * total ATK, symmetric variance, then critical/EX modifiers and final rounding. See FORMULAS.md for examples and editable settings.


Current full campaign chart: edit campaign-config.js; campaign-schedule.js owns the internal clock/checkpoints. See NOTES.md Full replacement campaign chart. Legacy formation triggers remain disabled. Admin seed0 still forces1HP.
