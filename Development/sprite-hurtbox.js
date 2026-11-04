const cache=new WeakMap();
const animationCache=new WeakMap();

/** Average every aligned pose once, then share one stable oval across the animation set. */
export function animationSpriteHurtbox(character,getFrameRectangle,padding=8) {
  const identity=character.animationFrames||character.image;
  let sizes=animationCache.get(identity);if(!sizes){sizes=new Map();animationCache.set(identity,sizes);}
  const size=character.spriteSize||89.6,key=`${size}:${character.referenceSize||215}`;
  if(sizes.has(key))return sizes.get(key);
  const scale=(size-padding*2)/(character.referenceSize||215),poses=[];
  if(character.animationFrames) {
    const clips=[character.animationFrames,...Object.values(character.actionAnimations||{})];
    for(const frames of clips)for(const frame of frames) {
      const image=frame.image;
      poses.push({image,crop:{x:0,y:0,width:image.naturalWidth,height:image.naturalHeight,footY:image.naturalHeight}});
    }
  } else {
    for(const direction of Object.keys(character.rows||{}))for(let frame=0;frame<character.layout.columnEdges.length-1;frame++) {
      poses.push({image:character.image,crop:getFrameRectangle({...character,attack:null,moving:true,direction,facing:direction},frame)});
    }
    for(const name of Object.keys(character.attacks||{}))for(const facing of Object.keys(character.attacks[name].rows))
      for(let frame=0;frame<character.layout.columnEdges.length-1;frame++)
        poses.push({image:character.image,crop:getFrameRectangle({...character,attack:{name,facing}},frame)});
  }
  if(!poses.length)return null;
  for(const pose of poses) {
    const c=pose.crop;pose.width=c.width*scale;pose.height=c.height*scale;
    pose.x=c.anchorX===undefined?-pose.width/2:-(c.anchorX-c.x)*scale;
    pose.y=size/2-padding-(c.footY-c.y)*scale;
  }
  const left=Math.min(...poses.map(p=>p.x)),top=Math.min(...poses.map(p=>p.y));
  const width=Math.max(...poses.map(p=>p.x+p.width))-left,height=Math.max(...poses.map(p=>p.y+p.height))-top;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  // Add equal alpha contributions instead of source-over, so every pose has equal weight.
  context.globalCompositeOperation='lighter';context.globalAlpha=1/poses.length;
  for(const p of poses)context.drawImage(p.image,p.crop.x,p.crop.y,p.crop.width,p.crop.height,
    (p.x-left)/width*32,(p.y-top)/height*32,p.width/width*32,p.height/height*32);
  const mask=spriteDamageMask(canvas,{x:0,y:0,width:32,height:32});
  const result={offsetX:left+width/2,offsetY:top+height/2+(character.bossVisualOffsetY||0),width,height,mask};
  sizes.set(key,result);return result;
}
/** Fit one ellipse with at least 90% opaque-pixel coverage and the least empty area.
 * Diagnostics expose whether the requested <=5% empty-space target is geometrically possible.
 */
export function fitSpriteOval(runs) {
  const points=[];
  for(const run of runs)for(let i=0;i<Math.round(run.width*32);i++)
    points.push({x:run.x-run.width/2+(i+.5)/32,y:run.y});
  if(!points.length)return null;
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  const left=Math.min(...xs)-1/64,right=Math.max(...xs)+1/64,top=Math.min(...ys)-1/64,bottom=Math.max(...ys)+1/64;
  const width=right-left,height=bottom-top;
  const center={x:(left+right)/2,y:(top+bottom)/2};
  const centroid={x:xs.reduce((a,b)=>a+b,0)/points.length,y:ys.reduce((a,b)=>a+b,0)/points.length};
  let best=null;
  for(const c of [center,centroid,{x:center.x,y:centroid.y}])
    for(let a=0;a<=10;a++)for(let b=0;b<=10;b++) {
      const rx=width*(.4+a*.05),ry=height*(.4+b*.05);
      let inside=0;
      for(const p of points)if(((p.x-c.x)/rx)**2+((p.y-c.y)/ry)**2<=1)inside++;
      const coverage=inside/points.length;
      if(coverage<.9)continue;
      const emptyFraction=Math.max(0,1-inside/(1024*Math.PI*rx*ry));
      if(!best||emptyFraction<best.emptyFraction)best={...c,rx,ry,coverage,emptyFraction,meetsTargets:emptyFraction<=.05};
    }
  return best;
}
/** Cache a compact alpha silhouette per animation crop; transparent sprite-sheet padding cannot take hits. */
export function spriteDamageMask(image,crop) {
  let frames=cache.get(image);if(!frames){frames=new Map();cache.set(image,frames);}
  const key=[crop.x,crop.y,crop.width,crop.height].join(':');
  if(frames.has(key))return frames.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,crop.x,crop.y,crop.width,crop.height,0,0,32,32);
  const pixels=context.getImageData(0,0,32,32).data,runs=[];
  for(let y=0;y<32;y++)for(let x=0;x<32;) {
    if(pixels[(y*32+x)*4+3]<32){x++;continue;}
    const start=x;while(x<32&&pixels[(y*32+x)*4+3]>=32)x++;
    runs.push({x:(start+x)/64,y:(y+.5)/32,width:(x-start)/32,height:1/32});
  }
  runs.ellipse=fitSpriteOval(runs);
  frames.set(key,runs);return runs;
}
