import { bossBehaviorSettings } from './game-config.js';
import { gifFrameAt } from './gif-animation.js';
import { spriteDisplayPadding, normalSpriteSize } from './scene-metrics.js';
/** Fit the whole sheet once; narrower attack crops must never enlarge individual frames. */
export function lineupSheetScale(template) {
  const layout=template.layout;
  let width=0,height=0;
  for(let frame=0;frame<layout.columnEdges.length-1;frame++) {
    for(let row=0;row<layout.rowEdges[frame].length-1;row++) {
      const crop=layout.frames?.[row]?.[frame];
      width=Math.max(width,crop?.width ?? layout.columnEdges[frame+1]-layout.columnEdges[frame]);
      height=Math.max(height,crop?.height ?? layout.rowEdges[frame][row+1]-layout.rowEdges[frame][row]);
    }
  }
  return Math.min(((template.spriteSize || normalSpriteSize)-spriteDisplayPadding*2)/(template.referenceSize||215),200/width,205/height);
}

/** Show stationary, AI-free copies of every mob in eight direction columns. */
export function openAnimationLineup(characters) {
  document.querySelector('#animation-lineup')?.close();
  document.querySelector('#animation-lineup')?.remove();
  const directions=['down','downLeft','left','upLeft','up','upRight','right','downRight'];
  const dialog=document.createElement('dialog');
  dialog.id='animation-lineup';
  const header=document.createElement('header');
  const title=document.createElement('h2');title.textContent='Mob animation lineup — AI off';
  const close=document.createElement('button');close.type='button';close.textContent='Close';
  close.addEventListener('click',()=>dialog.close());header.append(title,close);dialog.append(header);
  const scroll=document.createElement('div');scroll.className='animation-lineup-scroll';dialog.append(scroll);
  const previews=[];
  const entries=Object.entries(characters).flatMap(([id,template])=>{
    if(!(template.standard||id==='mob'||template.miniBoss||template.boss))return [];
    const rows=[[id,template]];
    if(id==='neru')rows.push([id,{...template,label:`${template.label} / compress and leap`,previewBehavior:'leap'}]);
    for(const [name,frames] of Object.entries(template.actionAnimations||{})) rows.push([id,{...template,label:`${template.label} / ${name}`,animationFrames:frames}]);
    for(const [name,attack] of Object.entries(template.attacks||{})) rows.push([id,{...template,label:`${template.label} / ${attack.label||name}`,rows:attack.rows,frameDuration:attack.frameDuration}]);
    return rows;
  });
  for(const [id,template] of entries) {
    if(!template.layout&&!template.animationFrames)continue;
    const row=document.createElement('section');row.className='animation-lineup-row';
    const label=document.createElement('h3');label.textContent=template.label||id;row.append(label);
    for(const direction of (template.horizontalFacingOnly||template.animationFrames?['left','right']:directions)) {
      const cell=document.createElement('figure'),canvas=document.createElement('canvas');
      // Enough room for native-sized Mega sprites and the skipping animation.
      canvas.width=220;canvas.height=template.previewBehavior==='leap'?460:240;
      const caption=document.createElement('figcaption');caption.textContent=direction;
      cell.append(canvas,caption);row.append(cell);
      previews.push({canvas,template,direction,index:previews.length,scale:template.layout?lineupSheetScale(template):null});
    }
    scroll.append(row);
  }
  document.body.append(dialog);dialog.showModal();
  let request;
  const started=performance.now();
  /** Animate sheet frames in place, honoring custom crop rectangles and foot anchors. */
  function draw(now) {
    const elapsed=now-started;
    for(const {canvas,template,direction,index,scale:sheetScale} of previews) {
      const context=canvas.getContext('2d');context.clearRect(0,0,canvas.width,canvas.height);
      if(!template.image)continue;
      if(template.animationFrames) {
        const frame=template.animationFrames[gifFrameAt(template.animationFrames,elapsed)];
        const scale=Math.min(((template.spriteSize || normalSpriteSize)-spriteDisplayPadding*2)/(template.referenceSize||200),200/frame.image.naturalWidth,205/frame.image.naturalHeight);
        context.save();context.translate(110,template.previewBehavior==='leap'?430:210);
        if(template.previewBehavior==='leap') {
          const s=bossBehaviorSettings.neru,phase=elapsed/1000%(s.compressSeconds+s.leapSeconds+s.recoverySeconds);
          if(phase<s.compressSeconds)context.scale(1+.3*(phase/s.compressSeconds),1-.45*(phase/s.compressSeconds));
          else if(phase<s.compressSeconds+s.leapSeconds)context.translate(0,-Math.sin(Math.PI*(phase-s.compressSeconds)/s.leapSeconds)*s.leapHeight);
        }
        if(direction!==(template.nativeFacing||'left'))context.scale(-1,1);
        context.drawImage(frame.image,-frame.image.naturalWidth*scale/2,-frame.image.naturalHeight*scale,frame.image.naturalWidth*scale,frame.image.naturalHeight*scale);context.restore();continue;
      }
      const sequence=template.walkFrames?.[direction]||template.frameSequence||[1,2,3,4];
      const frame=sequence[Math.floor(elapsed/(template.frameDuration||110))%sequence.length];
      const row=template.rows[direction];
      if(row===undefined)continue;
      const layout=template.layout,x=layout.columnEdges[frame],y=layout.rowEdges[frame][row];
      const crop=layout.frames?.[row]?.[frame]||{x,y,width:layout.columnEdges[frame+1]-x,
        height:layout.rowEdges[frame][row+1]-y,anchorX:layout.anchorX?.[row]?.[frame],footY:layout.rowEdges[frame][row+1]};
      const scale=sheetScale;
      const mirrored=template.mirroredDirections?.includes(direction);
      const bounce=template.movementBounce;
      const hop=bounce?-bounce.height*Math.sin(Math.PI*(elapsed/1000/bounce.periodSeconds+index*.61803398875))**2:0;
      context.save();context.translate(110,185+hop);if(mirrored)context.scale(-1,1);
      context.drawImage(template.image,crop.x,crop.y,crop.width,crop.height,
        crop.anchorX===undefined?-crop.width*scale/2:-(crop.anchorX-crop.x)*scale,
        -(crop.footY-crop.y)*scale,crop.width*scale,crop.height*scale);
      context.restore();
    }
    request=requestAnimationFrame(draw);
  }
  dialog.addEventListener('close',()=>{cancelAnimationFrame(request);dialog.remove();},{once:true});
  dialog.addEventListener('contextmenu',event=>{event.preventDefault();dialog.close();});
  request=requestAnimationFrame(draw);
}
