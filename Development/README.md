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

Removed the extra character-name and numeric HP text beside the portrait. Beneath HP are six attack slots and six equipment slots, using 36.4px cells and 5.2px gaps (30% larger than the original grids; portrait remains 80px). The HP bar top edge aligns with the portrait. Empty attack/equipment positions use attack-slot.png/equipment-slot.png. Once populated, the base switches to empty-slot.png and the selected item icon is overlaid, hiding the placeholder sword/clothing artwork.

Set character.attackSlots or character.equipmentSlots to arrays of up to six `{ name, icon }` entries, or call the HUD controller's `setSlot('attack'|'equipment', index, item)` with zero-based indices; null clears the slot. Loadouts are stored per character. No attacks/equipment are auto-assigned and no selection menu or item mechanics are introduced.

HUD level display: bitmap-font.js reads font.png as 20px cells in 15 columns beginning at ASCII space. The upper-right label below EXP shows `LV: 1` by default and reflects character.level when set. It grows leftward for additional digits, uses crisp sprite glyphs, and does not add XP/level-up gameplay.

## Player EXP, health, and invincibility tools

Admin Tools includes Add EXP (editable amount), Next Level, Reduce HP, Gain HP, Full Heal, Reset Player Stats, and Invincibility. Development initializes every controllable character at level 1, 0 EXP, 100/100 HP, invincibility on. State stays per character for this page session and updates the HUD. NPC clones explicitly disable player invincibility.

The EXP curve in player-stats.js starts at 79 EXP for level 2, then uses round((4*(level+1))^2.1) - round((4*level)^2.1), following HoloCure. Awards preserve overflow and can grant multiple levels. Invincibility prevents death rather than damage: Reduce HP still works, including down to zero, and damage still flashes. `isPlayerDefeated(character)` returns true only at zero HP with invincibility disabled; use this guard for future defeat handling. Healing caps at max HP and damage caps at zero; health loss triggers existing white feedback. HP 0 does not end the development preview. Reset Player Stats restores level/EXP/HP and enables invincibility again. NPC contact now damages the player and enemies; enemy defeats can drop EXP and bonus loot.


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
