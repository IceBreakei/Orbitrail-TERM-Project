import {superSynergyRun,advanceSuperSynergyProgress,collectGoldenHammer,grantGoldenHammerPiece} from './super-synergy-rules.js';
import {safeDropLanding} from './exp-drops.js';
import {getCombatHitbox,segmentHitsBody} from './combat-hitboxes.js';
import {drawCrafterGlow,drawCrafterMarker} from './crafter-system.js';
export function createSuperSynergySystem({canvas,getPlayer}){
  const sources=[0,1,2].map(i=>`./generated/golden-hammer/piece-${i}.png`),images=sources.map(source=>{const image=new Image();image.src=source;return image;});
  const hud=document.createElement('img');hud.className='super-hammer-progress';hud.alt='Golden Hammer progress';hud.hidden=true;canvas.parentElement.append(hud);
  function update(player,previous=player){
    const progress=advanceSuperSynergyProgress(player);hud.hidden=progress.frame===null;
    if(progress.frame!==null){if(hud.getAttribute('src')!==sources[progress.frame])hud.src=sources[progress.frame];hud.title=superSynergyRun.hammer==='held'?'Golden Hammer ready':superSynergyRun.hammer==='ground'?'Pick up the Golden Hammer':'Super Synnergy progress';}
    if(superSynergyRun.hammer!=='ground')return;
    superSynergyRun.groundPosition??=safeDropLanding(player.x+80,player.y);
    const drop=superSynergyRun.groundPosition;if(!drop)return;
    const body=getCombatHitbox(player,false),from=getCombatHitbox({...player,x:previous.x,y:previous.y},false);
    if(segmentHitsBody({x:drop.x,y:drop.y-24,rx:17+body.rx,ry:24+body.ry},from.x,from.y,body.x,body.y))collectGoldenHammer();
  }
  return {ready:Promise.all(images.map(image=>image.decode())),update,
    givePiece(){const player=getPlayer();if(!grantGoldenHammerPiece(player))return false;update(player);return true;},
    relocate(){if(superSynergyRun.hammer==='ground')superSynergyRun.groundPosition=null;},
    draw(context,camera){const drop=superSynergyRun.groundPosition;if(superSynergyRun.hammer!=='ground'||!drop||!images[2].naturalWidth)return;
      const x=drop.x-camera.x,y=drop.y-camera.y;drawCrafterGlow(context,x,y,true);context.drawImage(images[2],x-16.5,y-48,33,48);drawCrafterMarker(context,x,y,canvas.width,canvas.height,true);}
  };
}
