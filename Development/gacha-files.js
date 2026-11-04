import { createCharacterStatsPanel } from './character-stats-panel.js';
import { drawSynergyIcon } from './synergy-icon.js';
import { fileSettings,rollFileRewards,acceptFileProduct } from './gacha-file-rules.js';
import { safeDropLanding,gainCredits } from './exp-drops.js';
import { getCombatHitbox,segmentHitsBody } from './combat-hitboxes.js';
import { createBitmapText } from './bitmap-font.js';

/** Boss delivery packages, a paused opening sequence, and individually accepted/dropped products. */
export function createGachaFiles({canvas,getPlayer,onOpen=()=>{},onChange=()=>{}}) {
  const drops=new Map();let nextId=0,active=false,animation=0,alignLight=()=>{};
  const image=new Image();image.src=fileSettings.icon;const ready=image.decode();
  const dialog=document.createElement('dialog');dialog.className='gacha-file-menu';dialog.setAttribute('aria-label','Gacha File');document.body.append(dialog);
  function label(element,value,wrap=false){element.setAttribute('aria-label',value);const graphic=document.createElement('canvas');element.append(graphic);createBitmapText(graphic,{variant:'font2',scale:1.2,wrap,maxWidth:canvas.getBoundingClientRect().width*.68}).setText(value);}
  function align(){const r=canvas.getBoundingClientRect();Object.assign(dialog.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});}
  function syncOverlay(){if(active){align();alignLight();}}
  window.addEventListener('resize',syncOverlay);
  // Fixed dialogs must follow the canvas when the page or an ancestor scroller moves.
  window.addEventListener('scroll',syncOverlay,true);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncOverlay).observe(canvas);
  function close(){cancelAnimationFrame(animation);active=false;dialog.close();canvas.focus();onChange();}
  function open(drop) {
    if(active)return;active=true;drops.delete(drop.id);onOpen();align();dialog.replaceChildren();
    const reward=rollFileRewards(getPlayer(),{forceType:drop.forceType});dialog.classList.toggle('super-file',reward.type==='super');
    const stats=document.createElement('aside');stats.className='gacha-file-stats pause-character-stats';
    createCharacterStatsPanel({root:stats,scale:Math.min(1,canvas.getBoundingClientRect().width/1280)}).update(getPlayer());
    const panel=document.createElement('section');panel.className='gacha-file-panel';
    const heading=document.createElement('h2');label(heading,reward.type==='super'?'SUPER FILE!':reward.type==='triple'?'TRIPLE FILE!':'GACHA FILE');
    const counter=document.createElement('div');counter.className='gacha-file-counter';
    const coin=document.createElement('img');coin.src='../sprites/icons/credits.png';coin.alt='Credits';
    const amount=document.createElement('canvas');const creditText=createBitmapText(amount,{variant:'font2',scale:1.4,wrap:false});creditText.setText('0');counter.append(coin,amount);
    const file=document.createElement('button');file.type='button';file.className='gacha-file-package';file.setAttribute('aria-label','Open File');
    const graphic=document.createElement('img');graphic.src=fileSettings.icon;graphic.alt='Delivery File';graphic.className='gacha-file-base';
    const lid=document.createElement('img');lid.src=fileSettings.icon;lid.alt='';lid.className='gacha-file-lid';
    const sheet=document.createElement('span');sheet.className='gacha-file-sheet';sheet.setAttribute('aria-hidden','true');file.append(graphic,sheet,lid);
    const cone=document.createElement('div');cone.className='gacha-file-cone';cone.hidden=true;
    const rays=document.createElement('div');rays.className='gacha-file-rays';rays.hidden=true;
    const rewardIcon=document.createElement('canvas');rewardIcon.width=rewardIcon.height=160;rewardIcon.className='gacha-file-reward-icon';rewardIcon.hidden=true;
    const detail=document.createElement('article');detail.className='gacha-file-detail';detail.hidden=true;
    const actions=document.createElement('div');actions.className='gacha-file-actions';actions.hidden=true;
    const take=document.createElement('button'),discard=document.createElement('button');take.type=discard.type='button';label(take,'Take');label(discard,'Drop');actions.append(take,discard);
    const done=document.createElement('button');done.type='button';done.className='gacha-file-done';done.hidden=true;label(done,'Continue');done.addEventListener('click',close);
    panel.append(heading,counter,cone,rays,rewardIcon,file);dialog.append(stats,panel,detail,actions,done);dialog.showModal();let started=false,finished=false,index=0;
    function alignSpotlight(){
      const stage=panel.getBoundingClientRect(),packet=file.getBoundingClientRect();
      panel.style.setProperty('--file-mouth-bottom',`${stage.bottom-(packet.top+packet.height*.45)}px`);
      panel.style.setProperty('--file-mouth-width',`${packet.width*.65}px`);
    }
    alignLight=alignSpotlight;graphic.addEventListener('load',alignSpotlight);alignSpotlight();
    function showProduct() {
      const product=reward.products[index];detail.replaceChildren();
      if(!product){actions.hidden=true;rewardIcon.hidden=true;rays.hidden=true;cone.hidden=true;done.hidden=false;detail.hidden=true;done.focus();return;}
      actions.hidden=false;detail.hidden=false;rewardIcon.hidden=false;rays.hidden=false;cone.hidden=false;
      rewardIcon.setAttribute('aria-label',product.name||product.weapon.name);
      const title=document.createElement('h3'),category=document.createElement('span'),description=document.createElement('p');
      label(title,product.name||product.weapon.name);label(category,product.super?'SUPER ITEM':product.category||'Weapon');
      label(description,product.description||`Receive ${product.weapon.name||'this product'}.`,true);
      const row=document.createElement('header');row.append(title,category);detail.append(row,description);
      const context=rewardIcon.getContext('2d');context.clearRect(0,0,160,160);
      const current=index;
      if(!drawSynergyIcon(rewardIcon,product.weapon,()=>index===current)) {
        const image=new Image();image.onload=()=>{
          if(index!==current)return;
          const crop=product.weapon.iconCrop||{x:0,y:0,width:image.naturalWidth,height:image.naturalHeight};
          const angle=(product.weapon.iconRotation||0)*Math.PI/180;
          const extent=Math.max(Math.abs(crop.width*Math.cos(angle))+Math.abs(crop.height*Math.sin(angle)),Math.abs(crop.width*Math.sin(angle))+Math.abs(crop.height*Math.cos(angle)));
          const scale=140/extent;context.save();context.translate(80,80);context.rotate(angle);
          context.drawImage(image,crop.x,crop.y,crop.width,crop.height,-crop.width*scale/2,-crop.height*scale/2,crop.width*scale,crop.height*scale);context.restore();
        };image.src=product.weapon.icon;
      }
      take.focus();
    }
    function resolve(takeProduct){const product=reward.products[index];if(!product)return;if(takeProduct&&!acceptFileProduct(getPlayer(),product))return;index++;onChange();showProduct();}
    take.addEventListener('click',()=>resolve(true));discard.addEventListener('click',()=>resolve(false));
    function reveal(){
      if(finished)return;finished=true;gainCredits(reward.credits);onChange();file.disabled=true;file.classList.add('revealed');
      for(let i=0;i<12;i++){const sparkle=document.createElement('span');sparkle.className='gacha-file-sparkle';sparkle.style.left=`${8+(i*23)%84}%`;sparkle.style.top=`${10+(i*31)%75}%`;sparkle.style.animationDelay=`${i*.13}s`;panel.append(sparkle);}
      showProduct();
    }
    file.addEventListener('click',()=>{
      if(started)return;started=true;alignSpotlight();file.classList.add('opening');cone.hidden=false;rays.hidden=false;const start=performance.now();
      for(let i=0;i<28;i++) {
        const mote=document.createElement('img');mote.src='../sprites/icons/credits.png';mote.alt='';mote.className='gacha-credit-mote';
        mote.style.setProperty('--start-x',`${8+(i*37)%84}%`);mote.style.setProperty('--start-y',`${30+(i*19)%65}%`);mote.style.animationDelay=`${i*.035}s`;dialog.append(mote);
      }
      function tick(now){if(!active)return;const t=Math.min(1,(now-start)/2200);creditText.setText(String(Math.floor(reward.credits*(1-(1-t)**3))));if(t<1)animation=requestAnimationFrame(tick);else reveal();}
      animation=requestAnimationFrame(tick);
    });
    dialog.oncancel=event=>{event.preventDefault();if(finished&&index>=reward.products.length)close();};
    dialog.oncontextmenu=event=>{event.preventDefault();if(finished&&index>=reward.products.length)close();};
  }
  function spawn(x,y,forceType){if(drops.size>=fileSettings.maxGround)return false;const point=safeDropLanding(x,y);if(!point)return false;const drop={id:++nextId,...point,forceType};drops.set(drop.id,drop);return drop;}
  return {ready,spawn,get active(){return active;},get count(){return drops.size;},
    roll(enemy){return (enemy.boss===true||['shiroko','iroha','arisu','neru'].includes(enemy.type))&&fileSettings.bossGuaranteed?spawn(enemy.x,enemy.y):false;},
    update(player,previous){if(active)return;const body=getCombatHitbox(player,false);for(const drop of drops.values())if(segmentHitsBody({x:drop.x,y:drop.y,rx:22+body.rx,ry:22+body.ry},previous?.x??player.x,previous?.y??player.y,body.x,body.y)){open(drop);break;}},
    draw(context,camera){if(!image.naturalWidth)return;for(const drop of drops.values()){const x=drop.x-camera.x,y=drop.y-camera.y;if(x<-30||y<-30||x>canvas.width+30||y>canvas.height+30)continue;context.drawImage(image,x-22,y-22,44,44);}},
    clear(){drops.clear();if(active)close();}};
}
