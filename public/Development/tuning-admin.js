import {tuningPartCatalog,tuningPartSettings,tuningPartMaxLevel,tuningPartLevelLabel} from './tuning-parts.js';
/** Manual test drops bypass random odds and run exclusions, without changing natural drops. */
export function createTuningAdmin({root,getPlayer,system}) {
  const buttons=root.querySelector('#admin-tuning-buttons'),level=root.querySelector('#admin-tuning-level');
  const status=root.querySelector('#admin-tuning-status');buttons.replaceChildren();
  for(const part of tuningPartCatalog){
    const button=document.createElement('button');button.type='button';button.textContent=`Spawn ${part.name}`;
    button.addEventListener('click',()=>{
      const requested=Number(level.value);if(!Number.isInteger(requested)||requested<1||requested>tuningPartSettings.maxLevel)return;
      const rank=Math.min(requested,tuningPartMaxLevel(part));
      const player=getPlayer(),drop=system.spawn(player.x+80,player.y,{id:part.id,level:rank});
      status.textContent=drop?`${part.name} ${tuningPartLevelLabel({id:part.id,level:rank})} spawned near the player.`:'No safe ground available for this drop.';
    });buttons.append(button);
  }
}
