import { combatHitboxes } from './combat-hitboxes.js';
import { normalSpriteSize, sweeperSettings } from './game-config.js';

/** Shared five-frame/eight-direction layout measured from the Sweeper sheets. */
export function createSweeper(label, source) {
  const rowEdges = [0, 220, 420, 620, 820, 1015, 1210, 1405, 1586];
  const enemy = {
    label, source, standard: true, contactDamage: 1,
    spriteSize: normalSpriteSize * sweeperSettings.sizeRatio,
    referenceSize: 160,
    rows: { down: 0, downLeft: 1, left: 2, upLeft: 3, up: 4, upRight: 5, right: 6, downRight: 7 },
    frameSequence: [0, 1, 2, 3, 4],
    layout: { columnEdges: [0, 198, 397, 595, 794, 992],
      rowEdges: Array.from({ length: 5 }, () => [...rowEdges]) },
    combatHitbox: combatHitboxes.mob, // Share Mob circle/center adjustments instead of duplicating them.
    x: 590, y: 260, direction: 'down', elapsed: 0, moving: false
  };
  // Normal and Mega variants inherit the same frame-alignment measurements.
  const centers={"WhiteSweeper.png":[[102.0, 102.5, 102.5, 103.0, 101.0], [93.0, 93.5, 93.0, 94.0, 94.0], [91.0, 92.5, 92.5, 92.5, 91.0], [99.5, 100.0, 99.5, 100.5, 98.5], [101.5, 102.0, 101.5, 101.0, 100.5], [100.5, 101.0, 100.5, 99.0, 99.5], [104.0, 107.0, 105.5, 107.5, 105.0], [106.0, 106.0, 105.5, 105.0, 104.5]],"HeavySweeper.png": [[112.0, 112.5, 108.5, 106.5, 104.5], [105.5, 104.0, 99.0, 95.5, 91.5], [103.5, 102.0, 99.0, 97.0, 91.5], [106.5, 104.5, 100.5, 98.0, 94.5], [113.5, 111.0, 107.0, 104.5, 101.0], [116.5, 115.5, 109.5, 108.5, 103.0], [114.0, 112.0, 108.0, 105.5, 101.5], [120.5, 119.5, 116.5, 113.5, 110.5]], "OPS Sweeper.png": [[110.0, 105.5, 99.0, 93.5, 90.0], [103.5, 99.5, 94.0, 89.5, 86.0], [100.0, 97.5, 92.5, 86.5, 84.0], [103.5, 102.0, 97.0, 92.5, 89.0], [109.5, 105.5, 99.5, 94.5, 90.5], [110.5, 107.0, 101.5, 97.0, 93.0], [114.0, 111.0, 104.5, 102.0, 97.5], [99.5, 97.0, 91.5, 86.0, 83.5]]};
  const file=source.split('/').at(-1).split('?')[0];
  if(centers[file]) enemy.layout.anchorX=centers[file].map(row=>row.map((center,frame)=>enemy.layout.columnEdges[frame]+center));
  return enemy;
}

