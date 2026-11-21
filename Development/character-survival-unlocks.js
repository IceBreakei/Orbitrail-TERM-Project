import { unlockContent, isUnlockSimulation } from './item-catalog.js';
/** Per-character active survival time; stage changes never reset this single-run progress. */
export function createCharacterSurvivalUnlocks(){
 let aronaSeconds=0,planaSeconds=0,ended=false,grantedMode=null,planaGrantedMode=null;
 return {update(delta,character,{paused=false,alive=true}={}){
   if(paused)return;if(!alive)ended=true;if(ended||!Number.isFinite(delta)||delta<=0)return;
   if(String(character.label||'').toLowerCase()==='arona')aronaSeconds+=delta;
   if(String(character.label||'').toLowerCase()==='plana')planaSeconds+=delta;
   const mode=isUnlockSimulation();
   if(planaSeconds>=600&&planaGrantedMode!==mode){unlockContent('special-pharmaceuticals');planaGrantedMode=mode;}
   if(aronaSeconds>=600&&grantedMode!==mode){unlockContent('chise-plushie');grantedMode=mode;}
  },get aronaSeconds(){return aronaSeconds;},get planaSeconds(){return planaSeconds;}};
}
