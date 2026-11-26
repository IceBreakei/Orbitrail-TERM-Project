import { weaponKnockbackMultiplier } from './game-config.js';
import {tuningPerk} from './tuning-parts.js';
import {applySkillControl} from './enemy-control.js';
export function knockbackTuningMultiplier(player){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null);
  return main==='plana-umbrella'&&player.tuningParts?1+tuningPerk(player.tuningParts,'knockbackStrengthPercent')/100:1;
}
export function applyTuningKnockback(player,enemy){
  if(!enemy||enemy.hp<=0||!player.tuningParts||knockbackTuningMultiplier(player)===1)return false;
  const frames=tuningPerk(player.tuningParts,'knockbackFrames'),speed=tuningPerk(player.tuningParts,'knockbackSpeed');
  if(!frames||!speed)return false;
  const dx=enemy.x-player.x,dy=enemy.y-player.y,length=Math.hypot(dx,dy),distance=speed*frames*weaponKnockbackMultiplier(player);
  applySkillControl(enemy,(length?dx/length:1)*distance,(length?dy/length:0)*distance,0,frames/60);
  return true;
}
