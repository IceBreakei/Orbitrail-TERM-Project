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
