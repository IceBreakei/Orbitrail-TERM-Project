import { createBitmapText } from './bitmap-font.js';
import { drawSynergyIcon } from './synergy-icon.js';
import { supportIcon } from './support-items.js';

/** All temporary combat buffs share one HUD; gear remains in its existing inventory row. */
export function activeHudBuffs(player){
 if(!player||player.hp<=0)return [];
 const entries=[];
 for(const [id,buff] of Object.entries(player.combatBuffs||{})){
  if(!buff||buff.active===false||(Number.isFinite(buff.remaining)&&buff.remaining<=0))continue;
  const baseId=id.replace(/-ex$/,''),skill=player.characterSkills?.find(s=>s?.id===id);
  const weapon=player.attackSlots?.find(w=>w?.id===baseId)||(baseId==='princess-key'?player.attackSlots?.find(w=>w?.id==='decagrammaton'):null);
  const source=skill||weapon,stacks=buff.stacks??(id==='phrenapates'?player.phrenapatesState?.stacks:undefined);
  entries.push({id,name:buff.name||source?.name||id.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '),
   artwork:buff.icon?{icon:buff.icon,iconCrop:buff.iconCrop,iconRotation:buff.iconRotation}:source||{icon:'../sprites/icons/Skill Book Node.png'},
   stacks:Number.isFinite(stacks)?Number(Math.max(0,stacks).toFixed(2)):undefined});
 }
 const drink=player.equipmentSlots?.find(i=>i?.id==='sports-drink'),state=player.sportsDrinkState;
 if(drink){
  const superItem=drink.isSuper||drink.awakened;
  if(superItem||state?.crit>0)entries.push({id:'sports-drink',name:superItem?'Super Sports Drink':'Sports Drink crit buff',artwork:drink,
   stacks:superItem?undefined:Math.min([10,15,20][Math.min(2,Math.max(0,(drink.level||1)-1))],Number(Math.max(0,state.crit).toFixed(2)))});
  if(!superItem&&state?.foodRemaining>0)entries.push({id:'sports-drink-food',name:'Sports Drink food bonus',artwork:drink});
 }
 if(player.supportState?.shieldRemaining>0)entries.push({id:'projectile-shield',name:'Projectile Shield',svg:supportIcon('projectile-shield')});
 if(player.supportState?.invulnerableRemaining>0)entries.push({id:'quick-dash',name:'Quick Dash invincibility',svg:supportIcon('quick-dash')});
 return entries;
}
/** Reuse icon DOM and bitmap counters; rebuild artwork only when its source changes. */
export function createBuffHud(root){
 const nodes=new Map();if(!root)return {update(){}};
 function update(player){
  const buffs=activeHudBuffs(player),ids=new Set(buffs.map(b=>b.id));
  for(const [id,entry]of nodes)if(!ids.has(id)){entry.element.remove();nodes.delete(id);}
  root.hidden=buffs.length===0;
  for(const buff of buffs){
   let entry=nodes.get(buff.id);
   if(!entry){const element=document.createElement('div'),art=document.createElement('canvas'),svg=document.createElement('span'),count=document.createElement('canvas');
    element.className='hud-buff';element.setAttribute('role','img');element.dataset.buffId=buff.id;
    art.width=art.height=96;art.className='hud-buff-icon';svg.className='hud-buff-icon';count.className='hud-buff-stacks';count.setAttribute('aria-hidden','true');
    const counter=createBitmapText(count,{variant:'font2',scale:1,outlineOverlap:1});element.append(art,svg,count);root.append(element);
    entry={element,art,svg,count,counter,key:null,countValue:null};nodes.set(buff.id,entry);
   }
   const label=`${buff.name}${buff.stacks!==undefined?`, ${buff.stacks} stacks`:''}`;
   entry.element.setAttribute('aria-label',label);entry.element.title=label;
   entry.count.hidden=buff.stacks===undefined;
   if(buff.stacks!==undefined&&entry.countValue!==buff.stacks){entry.countValue=buff.stacks;entry.counter.setText(String(buff.stacks));}
   const art=buff.artwork;const key=JSON.stringify([art?.id,art?.icon,art?.iconCrop,art?.iconRotation,art?.iconFlipX,art?.synergyTopWeaponId,buff.svg]);if(entry.key===key)continue;entry.key=key;
   entry.art.hidden=Boolean(buff.svg);entry.svg.hidden=!buff.svg;
   if(buff.svg){entry.svg.innerHTML=buff.svg;continue;}
   const item=buff.artwork,context=entry.art.getContext('2d');context.clearRect(0,0,96,96);
   if(drawSynergyIcon(entry.art,item,()=>entry.key===key))continue;
   const image=new Image();image.onload=()=>{
    if(entry.key!==key||nodes.get(buff.id)!==entry)return;
    const crop=item.iconCrop||{x:0,y:0,width:image.naturalWidth,height:image.naturalHeight},angle=(item.iconRotation||0)*Math.PI/180;
    const width=Math.abs(crop.width*Math.cos(angle))+Math.abs(crop.height*Math.sin(angle)),height=Math.abs(crop.width*Math.sin(angle))+Math.abs(crop.height*Math.cos(angle)),scale=88/Math.max(width,height);
    context.save();context.translate(48,48);context.rotate(angle);if(item.iconFlipX)context.scale(-1,1);context.drawImage(image,crop.x,crop.y,crop.width,crop.height,-crop.width*scale/2,-crop.height*scale/2,crop.width*scale,crop.height*scale);context.restore();
   };image.src=item.icon;
  }
 }
 return {update};
}
