import { normalSpriteSize, spriteDisplayPadding } from './scene-metrics.js';
// EDIT zoom and source-pixel polygons to tune this finite, angled map.
export const islandScale = 2; // EDIT zoom: larger values show a closer view.
export const islandWidth = 1448 * islandScale;
export const islandHeight = 1086 * islandScale;
// Inner seawall/paving edge, including the concave inlet on the south side.
export const islandBoundary = [
  [154,309], [267,235], [506,145], [650,145],
  // Follow the recessed north seawall behind the tower instead of cutting
  // straight across the ocean to the right-hand promenade.
  [770,200], [895,176], [1096,145],
  [1277,345], [1392,502], [1320,671], [1055,822],
  [981,704], [781,756], [576,851], [208,764], [59,540]
];
const shoreClearance = 10; // EDIT extra safety distance from water in source pixels.

// Buildings follow their angled footprints. The center tower has only a LOW
// ground footprint here, leaving its visually tall roof/back projection walkable.
export const islandObstacles = [
  [[235,290],[330,230],[430,290],[440,375],[340,415],[255,370]],
  [[400,210],[490,170],[575,220],[585,300],[475,340],[420,305]],
  [[230,470],[305,455],[425,535],[410,605],[270,650],[215,570]],
  [[1010,275],[1090,240],[1170,315],[1180,380],[1070,420],[1000,365]],
  [[1110,460],[1190,420],[1260,485],[1250,555],[1155,600],[1090,545]],
  [[650,398],[730,375],[775,445],[722,490],[650,460]], // Tower foundation only.
  // Pond and its raised rim, following the angled oval in the map artwork.
  Array.from({ length: 24 }, (_, i) => [
    890 + 54 * Math.cos(i * Math.PI / 12),
    300 + 43 * Math.sin(i * Math.PI / 12)
  ]),
  // Requested large southwest lawn: follow the curb around the grass/trees.
  [[456,688],[472,637],[551,603],[672,722],[538,786]],
  // Requested triangular planted patch southeast of the center tower.
  [[908,550],[923,520],[980,498],[1048,577],[1038,596]],
];

const towerSilhouette = [[653,144],[692,70],[758,93],[768,438],[724,484],[652,450]];

/** Test source-space points against an angled polygon. */
export function pointInPolygon(x,y,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [xi,yi]=polygon[i], [xj,yj]=polygon[j];
    if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}

/** Reject any obstacle intersecting the actor's source-space foot rectangle. */
function intersectsBox(polygon,left,top,right,bottom) {
  if([[left,top],[right,top],[right,bottom],[left,bottom]].some(([x,y])=>pointInPolygon(x,y,polygon)))return true;
  if(polygon.some(([x,y])=>x>=left&&x<=right&&y>=top&&y<=bottom))return true;
  for(let i=0;i<polygon.length;i++) {
    const [x,y]=polygon[i], [xx,yy]=polygon[(i+1)%polygon.length];
    // Parametric clipping of each polygon edge against the rectangle.
    let enter=0,exit=1;
    for(const [p,q]of [[-(xx-x),x-left],[xx-x,right-x],[-(yy-y),y-top],[yy-y,bottom-y]]) {
      if(p===0){if(q<0){enter=2;break;}}else if(p<0)enter=Math.max(enter,q/p);else exit=Math.min(exit,q/p);
    }
    if(enter<=exit)return true;
  }
  return false;
}

/** Keep foot corners safely inside the paving, away from the sea-facing wall. */
function insideShore(x, y) {
  if (!pointInPolygon(x, y, islandBoundary)) return false;
  for (let i = 0; i < islandBoundary.length; i++) {
    const [ax, ay] = islandBoundary[i];
    const [bx, by] = islandBoundary[(i + 1) % islandBoundary.length];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    if (Math.hypot(x - ax - t * dx, y - ay - t * dy) < shoreClearance) return false;
  }
  return true;
}

/** Validate island containment and all obstacle footprints at an actor location. */
export function canStandOnIsland(character,x,y,map) {
  const size=character.spriteSize||normalSpriteSize;
  const sx=(x-map.originX)/islandScale;
  const sy=(y+size/2-spriteDisplayPadding-map.originY)/islandScale;
  const rx=size*.12/islandScale, ry=size*.05/islandScale;
  const corners=[[sx-rx,sy-ry],[sx+rx,sy-ry],[sx+rx,sy+ry],[sx-rx,sy+ry]];
  return corners.every(([x,y])=>insideShore(x,y)) &&
    !islandObstacles.some(p=>intersectsBox(p,sx-rx,sy-ry,sx+rx,sy+ry));
}

/** Find nearby boundary tangents for natural sliding along sloped collision edges. */
function contactTangents(character, x, y, map) {
  const size = character.spriteSize || normalSpriteSize;
  const px = (x - map.originX) / islandScale;
  const py = (y + size / 2 - spriteDisplayPadding - map.originY) / islandScale;
  const reach = Math.hypot(size * .12, size * .05) / islandScale + shoreClearance + 6;
  const tangents = [];
  for (const polygon of [islandBoundary, ...islandObstacles]) {
    for (let i = 0; i < polygon.length; i++) {
      const [ax, ay] = polygon[i];
      const [bx, by] = polygon[(i + 1) % polygon.length];
      const dx = bx - ax, dy = by - ay;
      const length = Math.hypot(dx, dy);
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (length * length)));
      if (Math.hypot(px - ax - t * dx, py - ay - t * dy) <= reach) {
        tangents.push([dx / length, dy / length]);
      }
    }
  }
  return tangents;
}

/** Sweep to contact, then project remaining motion onto the actual angled edge. */
export function resolveIslandMotion(character, fromX, fromY, toX, toY, map) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY)) / 6));
  const dx = (toX - fromX) / steps, dy = (toY - fromY) / steps;
  let x = fromX, y = fromY;
  for (let i = 0; i < steps; i++) {
    if (canStandOnIsland(character, x + dx, y + dy, map)) {
      x += dx; y += dy;
      continue;
    }
    // Reach the edge without crossing it; keep the unapplied movement for sliding.
    let low = 0, high = 1;
    for (let iteration = 0; iteration < 10; iteration++) {
      const fraction = (low + high) / 2;
      if (canStandOnIsland(character, x + dx * fraction, y + dy * fraction, map)) low = fraction;
      else high = fraction;
    }
    x += dx * low; y += dy * low;
    const remainingX = dx * (1 - low), remainingY = dy * (1 - low);
    const candidates = [[remainingX, 0], [0, remainingY]];
    for (const [tx, ty] of contactTangents(character, x, y, map)) {
      const along = remainingX * tx + remainingY * ty;
      candidates.push([tx * along, ty * along]);
    }
    let best = [0, 0], bestProgress = 0;
    for (const [sx, sy] of candidates) {
      const progress = sx * remainingX + sy * remainingY;
      if (progress > bestProgress && canStandOnIsland(character, x + sx, y + sy, map)) {
        best = [sx, sy]; bestProgress = progress;
      }
    }
    x += best[0]; y += best[1];
  }
  return { x, y };
}

/** Draw the entire finite image once; the camera zooms into this world-sized map. */
export function drawIsland(context,map,camera,debug=false) {
  context.drawImage(map.image,map.originX-camera.x,map.originY-camera.y,islandWidth,islandHeight);
  if(debug) {
    context.save();context.strokeStyle='#ffcf60';context.lineWidth=2;
    for(const polygon of [islandBoundary,...islandObstacles]) {
      context.beginPath();polygon.forEach(([x,y],i)=>{
        const args=[map.originX+x*islandScale-camera.x,map.originY+y*islandScale-camera.y];
        if(i===0)context.moveTo(...args);else context.lineTo(...args);
      });context.closePath();context.stroke();
    }context.restore();
  }
}

/** Occlude a behind-tower actor only inside its sprite area and the tower silhouette. */
export function drawTowerOcclusion(context,character,map,camera) {
  const size=character.spriteSize||normalSpriteSize;
  const foot=(character.y+size/2-spriteDisplayPadding-map.originY)/islandScale;
  if(foot>=440)return;
  context.save();
  context.beginPath();context.rect(character.x-camera.x-size/2,character.y-camera.y-size/2,size,size);context.clip();
  context.beginPath();towerSilhouette.forEach(([x,y],i)=>{
    const args=[map.originX+x*islandScale-camera.x,map.originY+y*islandScale-camera.y];
    if(i===0)context.moveTo(...args);else context.lineTo(...args);
  });context.closePath();context.clip();
  drawIsland(context,map,camera);context.restore();
}
