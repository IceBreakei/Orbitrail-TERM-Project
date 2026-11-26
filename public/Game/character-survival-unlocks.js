import { unlockContent, isUnlockSimulation } from './item-catalog.js';
/** Per-character active survival time; stage changes never reset this single-run progress. */
export function createCharacterSurvivalUnlocks(){
 let runSeconds=0,balloonsGrantedMode=null,aronaSeconds=0,planaSeconds=0,ended=false,grantedMode=null,planaGrantedMode=null;
 return {update(delta,character,{paused=false,alive=true}={}){
   if(paused)return;if(!alive)ended=true;if(ended||!Number.isFinite(delta)||delta<=0)return;
   runSeconds+=delta;
   if(String(character.label||'').toLowerCase()==='arona')aronaSeconds+=delta;
   if(String(character.label||'').toLowerCase()==='plana')planaSeconds+=delta;
   const mode=isUnlockSimulation();
   if(runSeconds>=600&&character.flat===true&&character.attackSlots?.some(w=>w?.id==='moustache-medal')&&balloonsGrantedMode!==mode){unlockContent('cheering-balloons');balloonsGrantedMode=mode;}
   if(planaSeconds>=600&&planaGrantedMode!==mode){unlockContent('special-pharmaceuticals');unlockContent('moustache-medal');unlockContent('serve');unlockContent('time-to-surf');planaGrantedMode=mode;}
   if(aronaSeconds>=600&&grantedMode!==mode){unlockContent('chise-plushie');grantedMode=mode;}
  },get runSeconds(){return runSeconds;},get aronaSeconds(){return aronaSeconds;},get planaSeconds(){return planaSeconds;}};
}
