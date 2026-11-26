import { createPickupReentryGuard } from './pickup-reentry.js';
import {rateUpDropChance} from './rate-up-tuning.js';
import {drawCrafterMarker} from './crafter-system.js';
import {createCharacterStatsPanel} from './character-stats-panel.js';
import {createTuningRun,tuningPartMaxLevel,tuningPartLevelLabel,tuningPartSettings,tuningPartCatalog,rollTuningPart,equipTuningPart,strengthenTuningPart,tuningSellValue} from './tuning-parts.js';
import {safeDropLanding,gainCredits} from './exp-drops.js';
import {getCombatHitbox,segmentHitsBody} from './combat-hitboxes.js';
import {createBitmapText} from './bitmap-font.js';
/** Fit source artwork into the ground footprint without distorting its proportions. */
export function tuningGroundSpriteBounds(image,x,y,size=tuningPartSettings.groundSize){
  const scale=size/Math.max(image.naturalWidth,image.naturalHeight);
  const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
  return {x:x-width/2,y:y-size*.4-height/2,width,height};
}

/** Exact connectors from weapon bottom to each slot top, in diagram-local pixels. */
export function tuningLinkEndpoints(weapon,slots,diagram){
  const start={x:(weapon.left+weapon.right)/2-diagram.left,y:weapon.bottom-diagram.top};
  return slots.map(slot=>({x1:start.x,y1:start.y,x2:(slot.left+slot.right)/2-diagram.left,y2:slot.top-diagram.top}));
}
export function createTuningSystem({canvas,getPlayer:getCharacter,onOpen=()=>{},onChange=()=>{}}){
  const run=createTuningRun(),drops=[],images=new Map();let active=false,found=null,selected=0,inspectFound=false;const reentry=createPickupReentryGuard();
  const root=document.createElement('section');root.className='tuning-menu';root.hidden=true;root.setAttribute('aria-label','Tuning Parts');
  canvas.parentElement.append(root);
  const hud=document.createElement('div');hud.className='tuning-hud';(document.querySelector('.hud-player-info')||canvas.parentElement).append(hud);
  const getPlayer=()=>{const player=getCharacter();player.tuningParts=run;return player;};
  getPlayer();
  const definition=part=>tuningPartCatalog.find(p=>p.id===part?.id);
  function label(parent,text,options={}){const c=document.createElement('canvas');parent.append(c);createBitmapText(c,{variant:'font2',scale:1,wrap:false,...options}).setText(text);return c;}
  function button(parent,text,action,disabled=false){const b=document.createElement('button');b.type='button';b.disabled=disabled;b.setAttribute('aria-label',text);label(b,text);b.onclick=action;parent.append(b);return b;}
  function icon(parent,part){const d=definition(part);if(d?.icon){const img=document.createElement('img');img.src=d.icon;img.alt=d.name;parent.append(img);}}
  function updateHud(){hud.replaceChildren();for(const part of run.equipped){if(!part)continue;const slot=document.createElement('div');icon(slot,part);slot.title=`${definition(part)?.name} ${tuningPartLevelLabel(part)}`;hud.append(slot);}}
  function spawn(x,y,part){const point=safeDropLanding(x,y);if(!point)return false;const drop={...point,part:{...part}};drops.push(drop);return drop;}
  function finish(){if(found){const p=getPlayer();const drop=spawn(p.x,p.y,found);if(!drop)return;reentry.block(drop);found=null;}active=false;root.hidden=true;onChange();canvas.focus({preventScroll:true});}
  const statsRoot=document.createElement('aside');statsRoot.className='tuning-character pause-character-stats';
  const statsPanel=createCharacterStatsPanel({root:statsRoot});
  const workspace=document.createElement('div');workspace.className='tuning-workspace';
  root.append(statsRoot,workspace);
  let linkObserver;
  function render(){
    linkObserver?.disconnect();
    workspace.replaceChildren();statsPanel.update(getPlayer());
    const heading=document.createElement('h2');heading.className='tuning-heading';label(heading,'ATTACH!',{scale:2});workspace.append(heading);
    const diagram=document.createElement('div');diagram.className='tuning-diagram';workspace.append(diagram);
    const lines=document.createElementNS('http://www.w3.org/2000/svg','svg');lines.setAttribute('class','tuning-links');lines.setAttribute('aria-hidden','true');
    for(let i=0;i<3;i++)lines.append(document.createElementNS('http://www.w3.org/2000/svg','line'));diagram.append(lines);
    const weapon=document.createElement('div');weapon.className='tuning-weapon';weapon.setAttribute('aria-label','Starting weapon');diagram.append(weapon);
    const main=getPlayer().attackSlots?.find(w=>w?.id===(getPlayer().mainWeaponId??'plana-umbrella'));
    if(main?.icon){const image=new Image(),graphic=document.createElement('canvas');graphic.width=graphic.height=96;weapon.append(graphic);
      image.onload=()=>{const crop=main.iconCrop||{x:0,y:0,width:image.naturalWidth,height:image.naturalHeight};const angle=(main.iconRotation??45)*Math.PI/180,extent=Math.max(Math.abs(crop.width*Math.cos(angle))+Math.abs(crop.height*Math.sin(angle)),Math.abs(crop.width*Math.sin(angle))+Math.abs(crop.height*Math.cos(angle))),scale=80/extent,ctx=graphic.getContext('2d');ctx.save();ctx.translate(48,48);ctx.rotate(angle);ctx.drawImage(image,crop.x,crop.y,crop.width,crop.height,-crop.width*scale/2,-crop.height*scale/2,crop.width*scale,crop.height*scale);ctx.restore();};image.src=main.icon;
    }
    const foundGroup=document.createElement('div');foundGroup.className='tuning-found';label(foundGroup,'Found!');diagram.append(foundGroup);
    const foundButton=button(foundGroup,'',()=>{inspectFound=true;render();},!found);foundButton.className='tuning-slot';foundButton.setAttribute('aria-label',found?`${definition(found)?.name} ${tuningPartLevelLabel(found)}`:'Found: empty');foundButton.setAttribute('aria-pressed',String(inspectFound));icon(foundButton,found);
    const slots=document.createElement('div');slots.className='tuning-slots';diagram.append(slots);
    run.equipped.forEach((part,i)=>{
      const chooseSlot=()=>{selected=i;inspectFound=false;render();};
      const b=button(slots,'',chooseSlot);b.className='tuning-slot';
      // Select from the entire box on press, even when it contains no icon.
      b.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();chooseSlot();});b.setAttribute('aria-label',part?`${definition(part)?.name} ${tuningPartLevelLabel(part)}`:`Empty slot ${i+1}`);icon(b,part);b.setAttribute('aria-pressed',String(i===selected&&!inspectFound));b.setAttribute('data-tuning-slot',String(i));
      if(part){const level=document.createElement('span');level.className='tuning-slot-level';label(level,tuningPartLevelLabel(part));b.append(level);}
    });
    const alignLinks=()=>{
      const box=diagram.getBoundingClientRect();if(!box.width||!box.height)return;
      lines.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
      const endpoints=tuningLinkEndpoints(weapon.getBoundingClientRect(),[...slots.children].map(slot=>slot.getBoundingClientRect()),box);
      endpoints.forEach((point,i)=>{for(const [key,value] of Object.entries(point))lines.children[i].setAttribute(key,value);});
    };
    if(typeof ResizeObserver!=='undefined'){linkObserver=new ResizeObserver(alignLinks);linkObserver.observe(diagram);linkObserver.observe(weapon);for(const slot of slots.children)linkObserver.observe(slot);}
    const target=run.equipped[selected],shown=inspectFound?found:(target||found);
    const detail=document.createElement('section');detail.className='tuning-detail';detail.setAttribute('aria-live','polite');workspace.append(detail);
    const title=document.createElement('div');title.className='tuning-detail-title';label(title,shown?`${definition(shown)?.name} ${tuningPartLevelLabel(shown)}`:'Empty slot');label(title,'Tuning Part');detail.append(title);
    const body=document.createElement('div');body.className='tuning-detail-body';detail.append(body);const detailIcon=document.createElement('div');detailIcon.className='tuning-detail-icon';icon(detailIcon,shown);body.append(detailIcon);
    const value=shown?tuningSellValue(shown,getPlayer()):null;
    const description=definition(shown)?.levels?.[shown.level-1]?.description||'Select a slot to attach or manage a Tuning Part.';
    label(body,description+(value===null?'':` Sell: ${value} Credits.`),{wrap:true,maxWidth:430,highlightStats:true});
    const actions=document.createElement('div');actions.className='tuning-actions';workspace.append(actions);
    button(actions,'Strengthen',()=>{if(strengthenTuningPart(run,found,selected)){found=null;inspectFound=false;updateHud();onChange();render();}},!found||!target||target.level>=tuningPartMaxLevel(target));
    button(actions,found?(target?'Swap':'Equip'):'Remove',()=>{
      if(found){const result=equipTuningPart(run,found,selected);if(result.ok)found=result.previous;}
      else if(target){found=target;run.equipped[selected]=null;}
      inspectFound=false;updateHud();onChange();render();
    },!found&&!target);
    const selling=shown,sale=selling?tuningSellValue(selling,getPlayer()):null;
    button(actions,'Sell',()=>{run.excluded.add(selling.id);gainCredits(sale);if(selling===found)found=null;else run.equipped[selected]=null;updateHud();onChange();render();},!selling||sale===null);
    const finishButton=button(diagram,'Finish',finish);finishButton.className='tuning-finish';
  }
  function open(part=null){if(active)return;found=part;inspectFound=Boolean(part);const empty=run.equipped.findIndex(slot=>!slot);if(part&&empty>=0)selected=empty;active=true;onOpen();render();root.hidden=false;root.querySelector('button')?.focus({preventScroll:true});}
  root.addEventListener('contextmenu',e=>e.preventDefault());root.addEventListener('pointerdown',e=>{if(e.button===2){e.preventDefault();e.stopPropagation();finish();}});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}});
  return {run,get active(){return active;},open,spawn,
    roll(enemy,random=Math.random){const part=rollTuningPart(run,enemy,random,tuningPartCatalog.filter(part=>!drops.some(drop=>drop.part.id===part.id)),rateUpDropChance(enemy));return part?spawn(enemy.x,enemy.y,part):false;},
    clear(){drops.length=0;reentry.clear();},
    update(player,previous=player,delta=0){
      player.tuningParts=run;if(active)return;
      const body=getCombatHitbox(player,false),from=getCombatHitbox({...player,x:previous.x,y:previous.y},false);
      for(let i=0;i<drops.length;i++){
        const d=drops[i],shape={x:d.x,y:d.y-tuningPartSettings.groundSize*.4,rx:tuningPartSettings.groundSize*.6,ry:tuningPartSettings.groundSize*.6};
        const pickup={...shape,rx:shape.rx+body.rx,ry:shape.ry+body.ry};
        if(reentry.blocked(d,segmentHitsBody(pickup,body.x,body.y,body.x,body.y),delta))continue;
        if(segmentHitsBody(pickup,from.x,from.y,body.x,body.y)){
          drops.splice(i,1);reentry.forget(d);open(d.part);break;
        }
      }
    },
    draw(ctx,camera){for(const drop of drops){
      const x=drop.x-camera.x,y=drop.y-camera.y,width=canvas.width,height=canvas.height;
      const d=definition(drop.part);
      if(d?.icon){let img=images.get(d.icon);if(!img){img=new Image();img.src=d.icon;images.set(d.icon,img);}if(img.complete&&img.naturalWidth){ctx.save();ctx.shadowColor='#fff';ctx.shadowBlur=7;ctx.shadowOffsetX=ctx.shadowOffsetY=0;const bounds=tuningGroundSpriteBounds(img,x,y);ctx.drawImage(img,bounds.x,bounds.y,bounds.width,bounds.height);ctx.restore();}}
      if(x<0||x>width||y<0||y>height)drawCrafterMarker(ctx,x,y,width,height);
    }}
  };
}
