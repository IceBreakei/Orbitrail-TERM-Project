import { getAllEnemies, damageEnemy, isBossEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox } from './combat-hitboxes.js';
/** Square overlaid with a diamond; same center, eight outer points. */
export function decagrammatonReferenceStrokes(){return [
  [[40,40],[160,40],[160,160],[40,160],[40,40]],
  [[100,15],[185,100],[100,185],[15,100],[100,15]]
].map(stroke=>stroke.map(([x,y])=>({x,y})));}
export function ultimateTargets(enemies,view){return enemies.filter(enemy=>{
  if(isBossEnemy(enemy)||['shiroko','shiriko','arisu','neru','iroha'].includes(enemy.type))return false;
  const b=getEnemyHurtbox(enemy);return b.x+b.rx>=view.x&&b.x-b.rx<=view.x+view.width&&b.y+b.ry>=view.y&&b.y-b.ry<=view.y+view.height;
});}
/** Simulation-time flash and orange shockwave; execute all visible non-bosses together at 1.5s. */
export function createDecagrammatonUltimate(){
  let state=null;const marked=new Set();
  function clear(){for(const enemy of marked)delete enemy.ultimateWhite;marked.clear();state=null;}
  return {reset:clear,cast(player){if(!player.attackSlots?.some(w=>w?.id==='decagrammaton'))return false;
    clear();const p=getCombatHitbox(player,false);state={owner:player,x:p.x,y:p.y,age:0,slammed:false,radius:0};return true;},
    update(delta,player,view){if(!state)return;if(state.owner!==player){clear();return;}state.age+=Math.max(0,delta);
      const targets=ultimateTargets(getAllEnemies(),view);
      for(const e of targets){e.ultimateWhite=Math.min(1,state.age/.2);marked.add(e);}
      const extent=Math.max(...[[view.x,view.y],[view.x+view.width,view.y],[view.x,view.y+view.height],[view.x+view.width,view.y+view.height]].map(([x,y])=>Math.hypot(x-state.x,y-state.y)))+120;
      state.radius=Math.max(0,Math.min(1,(state.age-.25)/1.25))*extent;
      if(!state.slammed&&state.age>=1.5){state.slammed=true;for(const e of targets)damageEnemy(e.id,e.hp,player,'supercrit');}
      if(state.age>=1.95)clear();
    },draw(context,camera){if(!state)return;const t=state.age,x=state.x-camera.x,y=state.y-camera.y;
      context.save();context.globalCompositeOperation='lighter';
      const flash=Math.max(0,1-t/.35)*.95;
      context.fillStyle=`rgba(255,250,230,${flash})`;context.fillRect(0,0,context.canvas.width,context.canvas.height);
      if(t>=.25){const radius=state.radius,fade=Math.min(1,(1.95-t)/.45);
        const g=context.createRadialGradient(x,y,Math.max(0,radius-70),x,y,radius+50);
        g.addColorStop(0,'rgba(255,130,20,0)');g.addColorStop(.55,`rgba(255,145,35,${.5*fade})`);g.addColorStop(.7,`rgba(255,240,160,${.95*fade})`);g.addColorStop(1,'rgba(255,120,10,0)');
        context.fillStyle=g;context.fillRect(0,0,context.canvas.width,context.canvas.height);
        context.strokeStyle=`rgba(255,195,80,${.8*fade})`;context.lineWidth=8;context.shadowColor='#ff991f';context.shadowBlur=22;context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.stroke();
      }context.restore();
    },get active(){return Boolean(state);}};
}
