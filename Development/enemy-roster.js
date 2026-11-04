import { normalSpriteSize } from './scene-metrics.js';
import { combatHitboxes } from './combat-hitboxes.js';
import { createSweeper } from './sweeper-sprites.js';

// Five columns/eight direction rows. Individual sheets can override measured dimensions.
const columns=[0,198,397,595,794,992];

/** Independent templates: per-sheet crop edges remain editable for animation testing. */
export function createStandardEnemy(label, file, {height=1586, revision=''} = {}) {
  // Arius uses a 1585px sheet; round each cell boundary against its actual height.
  const sheetRows=Array.from({length:9},(_,i)=>Math.round(i*height/8));
  const enemy={label,source:`../sprites/enemies/normal/${file}${revision?`?v=${revision}`:''}`,standard:true,contactDamage:1,
    spriteSize:normalSpriteSize,referenceSize:215,frameSequence:[0,1,2,3,4],
    rows:{down:0,downLeft:1,left:2,upLeft:3,up:4,upRight:5,right:6,downRight:7},
    layout:{columnEdges:[...columns],rowEdges:Array.from({length:5},()=>[...sheetRows])},
    combatHitbox:combatHitboxes.mob,
    x:590,y:260,direction:'down',elapsed:0,moving:false};
  // Measured per-frame centers cancel sheet drift without changing crops or foot anchors.
  const horizontalCenters={"Arius1.png": [[108.5, 107.5, 99.5, 97.5, 90.5], [105.0, 107.5, 104.5, 103.5, 98.0], [98.0, 101.5, 100.0, 98.5, 96.0], [102.5, 107.5, 106.0, 101.5, 100.0], [102.0, 101.5, 97.5, 96.0, 94.5], [99.0, 91.0, 89.0, 84.5, 81.0], [97.5, 93.0, 88.0, 89.0, 87.5], [100.0, 94.0, 89.5, 88.0, 87.0]], "Highlander2.png": [[107.5, 116.0, 114.0, 115.5, 113.5], [100.5, 110.5, 110.0, 111.5, 113.5], [94.0, 102.0, 104.5, 110.5, 111.0], [97.0, 104.0, 104.5, 109.5, 109.0], [102.5, 107.0, 109.0, 112.5, 113.0], [99.0, 108.5, 107.5, 111.0, 110.0], [104.0, 110.0, 109.5, 113.5, 116.0], [106.0, 107.5, 109.0, 113.0, 116.5]]};
  if(horizontalCenters[file]) enemy.layout.anchorX=horizontalCenters[file].map((row)=>row.map((center,frame)=>columns[frame]+center));
  if(file==='Arius2.png') enemy.layout=arius2Layout(enemy.layout);
  return enemy;
}

/** New stage variants only; existing Mob/Sweeper identities keep their tuned stats/layouts. */
export function createAdditionalEnemyRoster() {
  return {
    mob2:createStandardEnemy('Mob 2','mob-2.png',{revision:'20261103'}),
    mob3:createStandardEnemy('Mob 3','mob-3.png',{revision:'20261103'}),
    opsSweeper:createSweeper('OPS Sweeper','../sprites/enemies/normal/OPS Sweeper.png'),
    arius1:createStandardEnemy('Arius 1','Arius1.png',{height:1585,revision:'20261103'}),
    arius2:createStandardEnemy('Arius 2','Arius2.png',{height:1585,revision:'20261103'}),
    arius3:createStandardEnemy('Arius 3','Arius3.png',{height:1585,revision:'20261103'}),
    highlander1:createStandardEnemy('Highlander 1','Highlander1.png',{revision:'20261103'}),
    highlander2:createStandardEnemy('Highlander 2','Highlander2.png',{revision:'20261103'}),
    highlander3:createStandardEnemy('Highlander 3','Highlander3.png',{revision:'20261103'})
  };
}


/** Visual hop only: collision and world positions stay grounded while Pedrozilla skips. */
export function enemyBounceOffset(character) {
  const bounce=character.movementBounce;
  if (!bounce || !character.moving || character.death) return 0;
  const seconds=character.eventMotionAge ?? (character.elapsed || 0)/1000;
  const period=bounce.periodSeconds*(character.bouncePeriodScale ?? 1);
  const phase=((seconds/period+(character.bouncePhase ?? 0))%1+1)%1;
  return -bounce.height*Math.sin(Math.PI*phase)**2;
}


/** Pedrozilla's staggered artwork needs per-frame bottom crops to exclude the next row. */
export function pedrozillaLayout(baseLayout) {
  // Measured main-sprite bottoms in source pixels, indexed by direction row then frame.
  const bottoms=[[194, 194, 186, 194, 194], [392, 393, 378, 391, 393], [591, 591, 579, 591, 594], [783, 780, 766, 780, 783], [975, 970, 959, 971, 975], [1169, 1167, 1149, 1167, 1170], [1370, 1366, 1352, 1370, 1370], [1572, 1565, 1554, 1572, 1572]];
  const frames=Object.fromEntries(bottoms.map((ends,row)=>[row,Object.fromEntries(ends.map((bottom,frame)=>{
    const x=baseLayout.columnEdges[frame],y=baseLayout.rowEdges[frame][row];
    return [frame,{x,y,width:baseLayout.columnEdges[frame+1]-x,height:bottom-y,
      footY:baseLayout.rowEdges[frame][row+1]}];
  }))]));
  return {...baseLayout,frames};
}


/** Remove adjacent-row pixels and compensate Arius 2's leftward frame drift. */
export function arius2Layout(baseLayout) {
  // Measured connected sprite bounds within each cell: left/top/right/bottom.
  const bounds=[[[61, 9, 177, 197], [52, 9, 169, 198], [40, 9, 157, 191], [30, 8, 145, 194], [19, 10, 135, 196]], [[49, 6, 173, 193], [41, 7, 163, 192], [28, 8, 151, 191], [19, 8, 142, 193], [10, 8, 132, 193]], [[44, 8, 166, 191], [35, 7, 158, 188], [24, 7, 151, 190], [14, 8, 140, 190], [5, 7, 133, 190]], [[60, 6, 176, 190], [51, 7, 169, 187], [40, 6, 157, 189], [31, 7, 149, 190], [22, 6, 138, 184]], [[55, 6, 175, 192], [47, 8, 168, 195], [38, 7, 158, 195], [29, 7, 148, 194], [18, 6, 138, 195]], [[63, 5, 180, 190], [56, 6, 172, 186], [45, 7, 164, 190], [37, 7, 156, 189], [27, 7, 148, 190]], [[62, 4, 175, 188], [51, 4, 164, 181], [42, 4, 154, 185], [33, 5, 147, 186], [24, 6, 139, 186]], [[52, 5, 181, 192], [42, 5, 172, 189], [32, 4, 163, 187], [23, 4, 154, 190], [15, 4, 143, 188]]];
  const frames=Object.fromEntries(bounds.map((cells,row)=>[row,Object.fromEntries(cells.map(([left,top,right,bottom],frame)=>{
    const cellX=baseLayout.columnEdges[frame],cellY=baseLayout.rowEdges[frame][row];
    const x=cellX+Math.max(0,left-1),y=cellY+Math.max(0,top-1);
    return [frame,{x,y,width:Math.min(baseLayout.columnEdges[frame+1],cellX+right+1)-x,
      height:Math.min(baseLayout.rowEdges[frame][row+1],cellY+bottom+1)-y,
      anchorX:cellX+(left+right)/2,footY:baseLayout.rowEdges[frame][row+1]}];
  }))]));
  return {...baseLayout,frames};
}
