# Project integration sizing contract

Do not migrate gameplay into project.html until the user approves it.

## Characters

Use scene-metrics.js in both the development preview and the eventual project renderer:

- Normal player/NPC sprite area: 112 CSS/world pixels.
- Boss sprite area: 224 CSS/world pixels.
- Shared sprite display padding: 7 pixels.

These values approximate the apparent size of the former 130/260-pixel actors after the old 1280-pixel canvas was displayed at roughly 1108 pixels wide. Actual visible artwork size still depends on each sheet's referenceSize and transparent padding. Preserve those per-sheet settings and source crops. Do not multiply character size by browser width, fullscreen size, or map zoom.

viewport.js sets canvas dimensions to its displayed CSS dimensions. This makes one world unit equal one displayed pixel; larger views reveal more world. Reuse it in the project screen. Keep the CSS canvas dimensions explicitly controlled by the viewport/container. If high-DPI rendering is added later, apply devicePixelRatio to the backing buffer/context only; keep world and collision coordinates in CSS pixels.

## Maps

- Playarea 1: scale background to viewport height; horizontal scroll only.
- Playarea 2: scale background to viewport width; vertical scroll only.
- Playarea 3: retain fixed world tile dimensions, overlap, seed, and source collision scale. Larger viewports display more tiles without enlarging them.
- Playarea 4: retain islandScale and finite image world dimensions. Larger viewports reveal more of the island; do not automatically fit/stretch the island to fullscreen.

Player/NPC rendering, collision footprints, placement bounds, tower occlusion, and arrow positioning use the same shared character size defaults. NPCs cloned from player sheets still use NPC movement speeds. Keep this distinction when implementing the future player character picker.
