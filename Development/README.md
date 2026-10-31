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
