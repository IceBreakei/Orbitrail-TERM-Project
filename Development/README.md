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
