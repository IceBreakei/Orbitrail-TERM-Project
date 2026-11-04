import { goldenCrafterChoices, applyGoldenCrafterChoice } from './golden-crafter-rules.js';
import { getCombatHitbox, segmentHitsBody } from './combat-hitboxes.js';
import { createCrafterMenu } from './crafter-menu.js';
import { crafterSettings, goldenCrafterChance } from './game-config.js';
import { applyCrafterChoice } from './crafter-rules.js';
import { safeDropLanding } from './exp-drops.js';

/** Shared draw/contact rectangle, including the icon's scale and upward ground offset. */
export function crafterSpriteBounds(drop) {
  const scale=crafterSettings.iconScale;
  return {left:drop.x-18*scale,right:drop.x+18*scale,top:drop.y-46*scale,bottom:drop.y+scale};
}

/** Inclusive swept segment/rectangle test, so fast movement cannot skip a Crafter. */
function segmentTouchesRectangle(from,to,box) {
  let enter=0,exit=1;
  for(const [start,end,min,max] of [[from.x,to.x,box.left,box.right],[from.y,to.y,box.top,box.bottom]]) {
    const delta=end-start;
    if(Math.abs(delta)<1e-10){if(start<min||start>max)return false;continue;}
    const a=(min-start)/delta,b=(max-start)/delta;
    enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
    if(enter>exit)return false;
  }
  return true;
}

/** Sweep the real player ellipse against the visible icon, with rounded-corner accuracy. */
export function crafterTouchesPlayer(drop,player,previous=player,padding=0) {
  const body=getCombatHitbox(player,false),from=getCombatHitbox({...player,x:previous.x,y:previous.y},false);
  const sprite=crafterSpriteBounds(drop);
  const box={left:sprite.left-padding,right:sprite.right+padding,top:sprite.top-padding,bottom:sprite.bottom+padding};
  // The Minkowski sum of a rectangle and ellipse is two bars plus four elliptical corners.
  if(segmentTouchesRectangle(from,body,{...box,left:box.left-body.rx,right:box.right+body.rx})||
    segmentTouchesRectangle(from,body,{...box,top:box.top-body.ry,bottom:box.bottom+body.ry}))return true;
  return [box.left,box.right].some(x=>[box.top,box.bottom].some(y=>
    segmentHitsBody({x,y,rx:body.rx,ry:body.ry},from.x,from.y,body.x,body.y)));
}

/** Steady white ground glow and soft cyan-white pillar; purely visual, with no flashing. */
export function drawCrafterGlow(context,x,y,golden=false) {
  const glow=crafterSettings.glow;
  context.save();context.globalCompositeOperation='lighter';context.globalAlpha=glow.opacity;
  if(golden)context.filter='sepia(1) saturate(4)';
  // Stretch a radial falloff into a narrow pillar, extending below and above the icon.
  context.save();context.translate(x,y-glow.pillarHeight*.45);
  context.scale(glow.pillarWidth/(glow.pillarHeight+24),1);
  const pillar=context.createRadialGradient(0,0,0,0,0,glow.pillarHeight*.6);
  pillar.addColorStop(0,'rgba(235,255,255,.6)');pillar.addColorStop(.35,'rgba(135,245,255,.32)');pillar.addColorStop(1,'rgba(100,235,255,0)');
  context.fillStyle=pillar;context.fillRect(-glow.pillarHeight,-glow.pillarHeight,glow.pillarHeight*2,glow.pillarHeight*2);context.restore();
  const core=context.createLinearGradient(0,y-glow.pillarHeight,0,y+8);
  core.addColorStop(0,'rgba(255,255,255,0)');core.addColorStop(.3,'rgba(235,255,255,.12)');core.addColorStop(.85,'rgba(255,255,255,.45)');core.addColorStop(1,'rgba(255,255,255,0)');
  context.fillStyle=core;context.fillRect(x-3,y-glow.pillarHeight,6,glow.pillarHeight+8);
  // Flatten the base into a luminous pool of light on the ground.
  context.globalAlpha=Math.min(1,glow.opacity*1.2);
  context.translate(x,y+2);context.scale(1,.32);
  const base=context.createRadialGradient(0,0,0,0,0,glow.baseRadius);
  base.addColorStop(0,'rgba(255,255,255,.95)');base.addColorStop(.3,'rgba(255,255,255,.65)');base.addColorStop(.65,'rgba(150,245,255,.3)');base.addColorStop(1,'rgba(120,235,255,0)');
  context.fillStyle=base;context.fillRect(-glow.baseRadius,-glow.baseRadius,glow.baseRadius*2,glow.baseRadius*2);
  context.restore();
}

/** Run-scoped, non-magnetic Crafter drops and the paused, cancellable upgrade menu. */
export function createCrafterSystem({getPlayer,canvas,onOpen=()=>{},onChange=()=>{},onResult=()=>{},golden=false,getMinuteTimer=()=>0}) {
  const drops=new Map();let nextId=0,active=null,ignoreUntilLeave=null;
  const toast=document.createElement('div');toast.className='crafter-toast';toast.setAttribute('role','status');toast.hidden=true;canvas.parentElement.append(toast);let toastTimer;
  const icon=new Image();icon.src=crafterSettings.icon.source;
  const ready=icon.decode();
  /** Close without consuming; require leaving its pickup radius before reopening. */
  function close() {ignoreUntilLeave=active;active=null;menu.close();canvas.focus({preventScroll:true});}
  const menu=createCrafterMenu({canvas,getPlayer,golden,onCancel:close,onAction:id=>{
    if(active===null||!drops.has(active))return;
    const result=golden?applyGoldenCrafterChoice(getPlayer(),id):applyCrafterChoice(getPlayer(),id);
    if(!result.consumed){menu.refresh();return;}
    drops.delete(active);close();onChange();
    // Successful fusion is shown directly by the new inventory weapon, without an alert.
    if(golden&&result.success)return;
    onResult(result.message);
    toast.textContent=result.message;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},4000);
  }});
  function open(drop) {active=drop.id;onOpen();menu.open();}
  /** Place on safe ground, respecting the twenty-Crafter limit even for test drops. */
  function spawn(x,y) {
    if(drops.size>=(golden?crafterSettings.goldenMaxGround:crafterSettings.maxGround))return false;
    const point=safeDropLanding(x,y);if(!point)return false;
    const drop={id:++nextId,...point};drops.set(drop.id,drop);return drop;
  }
  function roll(enemy,random=Math.random) {
    if(drops.size>=(golden?crafterSettings.goldenMaxGround:crafterSettings.maxGround))return false;
    // Credit Card can later supply this multiplier without changing the base drop chance.
    if(golden&&!goldenCrafterChoices(getPlayer()).length)return false;
    const chance=golden?goldenCrafterChance(getMinuteTimer()):Math.min(1,crafterSettings.dropChance*Math.max(0,getPlayer().crafterDropMultiplier??1));
    return random()<chance?spawn(enemy.x,enemy.y):false;
  }
  /** Walk onto a Crafter to open it; cancellation does not destroy the ground object. */
  function update(player,previous) {
    if(active!==null)return;
    for(const drop of drops.values()) {
      if(ignoreUntilLeave===drop.id) {
        if(!crafterTouchesPlayer(drop,player,player,crafterSettings.reentryPadding))ignoreUntilLeave=null;
        continue; // Leaving after Cancel must not immediately reactivate via the swept path.
      }
      if(crafterTouchesPlayer(drop,player,previous||player)){open(drop);break;}
    }
  }

  /** Draw the source-sheet icon and a large white directional triangle, clamped at screen edges. */
  function draw(context,camera,width,height) {
    if(!icon.naturalWidth)return;
    const crop=crafterSettings.icon;
    for(const drop of drops.values()) {
      const x=drop.x-camera.x,y=drop.y-camera.y;
      if(x>-40&&x<width+40&&y>-60&&y<height+crafterSettings.glow.pillarHeight)drawCrafterGlow(context,x,y,golden);
      const bounds=crafterSpriteBounds(drop);
      if(x>-40&&x<width+40&&y>-60&&y<height+40) {
        context.save();if(golden)context.filter='sepia(1) saturate(4)';
        context.drawImage(icon,crop.x,crop.y,crop.width,crop.height,
          bounds.left-camera.x,bounds.top-camera.y,bounds.right-bounds.left,bounds.bottom-bounds.top);context.restore();
      }
      const offscreen=x<20||x>width-20||y<20||y>height-20;
      let ax=x,ay=Math.max(28,y-crafterSettings.glow.pillarHeight-18),angle=Math.PI/2;
      if(offscreen) {
        const dx=x-width/2,dy=y-height/2;
        const scale=Math.min((width/2-30)/Math.max(.001,Math.abs(dx)),(height/2-30)/Math.max(.001,Math.abs(dy)));
        ax=width/2+dx*scale;ay=height/2+dy*scale;angle=Math.atan2(dy,dx);
      }
      context.save();context.translate(ax,ay);context.rotate(angle);context.fillStyle=golden?'#ffeaa0':'#fff';context.strokeStyle=golden?'#b88b20':'#1d719c';context.lineWidth=2;
      // Local +X is the tip; rotation points down at visible Crafters or toward offscreen ones.
      context.beginPath();context.moveTo(22,0);context.lineTo(-14,-17);context.lineTo(-14,17);context.closePath();context.fill();context.stroke();context.restore();
    }
  }
  return {ready,spawn,roll,update,draw,get active(){return active!==null;},get count(){return drops.size;},
    clear(){drops.clear();ignoreUntilLeave=null;if(active!==null)close();}};
}
