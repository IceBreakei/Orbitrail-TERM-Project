import { combatBalance } from './game-config.js';
import { normalSpriteSize, spriteDisplayPadding } from './scene-metrics.js';

// EDIT half-width, half-height and center offset as fractions of display size.
// Ellipses exclude transparent corners while covering more of the visible body.
export const combatHitboxes = {
  plana: { rx: 0.27, ry: 0.38, y: 0.03, playerOffsetY: 6, playerRadiusScale: 0.72 }, // Pixels downward for the controlled player.
  arona: { rx: 0.25, ry: 0.39, y: 0.03 },
  // Small foot-level ellipse: tune rx/ry for size; feet keeps it at the sprite baseline.
  midori: { rx: 0.13, ry: 0.075, radiusSize: normalSpriteSize, feet: true },
  yuuka: { rx: 0.25, ry: 0.42, y: 0.02 },
  mob: { rx: 0.28, ry: 0.28, y: 0.04, eliteOffsetY: 6, normalOffsetY: 6 }, // Circular Mob collider; elite variants scale the same profile.
  iroha: { rx: 0.44, ry: 0.29, y: 0.06 },
  shiroko: { rx: 0.30, ry: 0.30, y: 0.05 } // Center on the visible body below the halo.
};

/** Return a stable body ellipse, scaling automatically for elite/boss sizes. */
export function getCombatHitbox(character, enemy = Boolean(character.id)) {
  const name = (character.type || character.label || 'mob').toLowerCase();
  const key = Object.keys(combatHitboxes).find(type => name.includes(type)) || 'mob';
  const profile = character.combatHitbox || combatHitboxes[key];
  const size = character.spriteSize || normalSpriteSize;
  const hitboxScale = enemy ? combatBalance.enemyHitboxScale : 1;
  const radiusSize = profile.radiusSize || size;
  const rx = radiusSize * profile.rx * hitboxScale * (enemy ? 1 : profile.playerRadiusScale || 1);
  // Compress player height to the existing half-width, producing a centered circle.
  const ry = enemy ? radiusSize * profile.ry * hitboxScale : rx;
  // Foot-anchored profiles retain their small dimensions when the artwork grows.
  const offsetY = !enemy ? (profile.playerOffsetY || 0) : profile.feet ? size / 2 - spriteDisplayPadding - ry : size * profile.y;
  const eliteOffsetY = enemy ? (character.elite ? profile.eliteOffsetY || 0 : profile.normalOffsetY || 0) : 0;
  return { x: character.x, y: character.y + offsetY + eliteOffsetY, rx, ry };
}

/** Damage-receiving sprite bounds are separate from the small contact-damage ellipse. */
export function getEnemyHurtbox(character) {
  const size=character.spriteSize||normalSpriteSize;
  const bounds=character.spriteHurtbox||{offsetX:0,offsetY:0,width:size-spriteDisplayPadding*2,height:size-spriteDisplayPadding*2};
  const oval=bounds.mask?.ellipse;
  if(oval)return {x:character.x+bounds.offsetX+(oval.x-.5)*bounds.width*(bounds.mirrored?-1:1),
    y:character.y+bounds.offsetY+(oval.y-.5)*bounds.height,
    rx:oval.rx*bounds.width,ry:oval.ry*bounds.height,shape:'ellipse',
    coverage:oval.coverage,emptyFraction:oval.emptyFraction,meetsTargets:oval.meetsTargets};
  return {x:character.x+bounds.offsetX,y:character.y+bounds.offsetY,
    rx:Math.max(1,bounds.width/2),ry:Math.max(1,bounds.height/2),shape:'rectangle',
    mask:bounds.mask,mirrored:bounds.mirrored,maskWidth:bounds.width,maskHeight:bounds.height};
}

/** Test a segment against sprite rectangles or the existing contact ellipses. */
export function segmentHitsBody(body, x1, y1, x2, y2) {
  if(body.shape==='rectangle') {
    let near=0,far=1;
    for(const [start,end,center,radius] of [[x1,x2,body.x,body.rx],[y1,y2,body.y,body.ry]]) {
      const delta=end-start;
      if(Math.abs(delta)<1e-10){if(start<center-radius||start>center+radius)return false;continue;}
      let a=(center-radius-start)/delta,b=(center+radius-start)/delta;
      if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);
      if(near>far)return false;
    }
    if(!body.mask)return true;
    // The broad crop rectangle overlaps; now require actual opaque sprite pixels.
    const padX=Math.max(0,body.rx-body.maskWidth/2),padY=Math.max(0,body.ry-body.maskHeight/2);
    return body.mask.some(run=>segmentHitsBody({shape:'rectangle',
      x:body.x+(run.x-.5)*body.maskWidth*(body.mirrored?-1:1),
      y:body.y+(run.y-.5)*body.maskHeight,
      rx:run.width*body.maskWidth/2+padX,ry:run.height*body.maskHeight/2+padY},x1,y1,x2,y2));
  }
  const x = (x1 - body.x) / body.rx, y = (y1 - body.y) / body.ry;
  const dx = (x2 - x1) / body.rx, dy = (y2 - y1) / body.ry;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, -(x * dx + y * dy) / length)) : 0;
  return (x + dx * t) ** 2 + (y + dy * t) ** 2 <= 1;
}
