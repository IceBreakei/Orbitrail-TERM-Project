import {tuningPerk} from './tuning-parts.js';
export const trumpetTuningSettings={source:'../Audio/SFX/why.mp3'};
const lastDoot=new WeakMap(),voices=new Set(),voiceGains=new WeakMap(),boundSliders=new WeakSet(),boostNodes=new WeakMap();let clock=0,volume=1,audioContext;
export function updateTrumpetTuning(delta){clock+=Math.max(0,delta);}
/** Independent voices overlap and finish naturally; no pause/reset/restart on another shot. */
export function playTrumpetTuning(player,weaponId='plana-umbrella'){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null),run=player.tuningParts;
  if(weaponId!==main||!run||typeof Audio==='undefined')return false;
  const frames=tuningPerk(run,'dootCooldownFrames');if(!frames||clock-(lastDoot.get(run)??-Infinity)<frames/60-1e-8)return false;
  lastDoot.set(run,clock);
  const voice=new Audio(trumpetTuningSettings.source);voice.loop=false;voiceGains.set(voice,tuningPerk(run,'dootVolume'));voice.volume=Math.min(1,voiceGains.get(voice))*volume;voices.add(voice);
  if(voiceGains.get(voice)>1){
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(Context)try{
      audioContext??=new Context();
      if(audioContext.state==='suspended')audioContext.resume()?.catch(()=>{});
      const source=audioContext.createMediaElementSource(voice),gain=audioContext.createGain();
      gain.gain.value=voiceGains.get(voice);source.connect(gain);gain.connect(audioContext.destination);boostNodes.set(voice,{source,gain});
    }catch{}
  }
  const finished=()=>{voices.delete(voice);const nodes=boostNodes.get(voice);if(nodes){nodes.source.disconnect();nodes.gain.disconnect();boostNodes.delete(voice);}};voice.addEventListener('ended',finished,{once:true});voice.addEventListener('error',finished,{once:true});
  try{const playing=voice.play();playing?.catch(finished);}catch{finished();}
  return true;
}
export function trumpetVoiceCount(){return voices.size;}

/** Match the existing volume control, including voices already ringing out. */
export function setTrumpetVolume(value){
  volume=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
  for(const voice of voices)voice.volume=Math.min(1,voiceGains.get(voice))*volume;
}
export function bindTrumpetVolume(slider){
  if(!slider||boundSliders.has(slider))return;
  boundSliders.add(slider);const sync=()=>setTrumpetVolume(Number(slider.value)/100);
  slider.addEventListener('input',sync);sync();
}
