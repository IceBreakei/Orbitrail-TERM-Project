import {tuningPerk} from './tuning-parts.js';
export function rgbTuningActive(player,weaponId='plana-umbrella'){
  return Boolean(player.tuningParts&&tuningPerk(player.tuningParts,'rainbowTrail'));
}
export function rainbowTrailGradient(context,x1,y1,x2,y2){
  const gradient=context.createLinearGradient(x1,y1,x2,y2);
  ['#ff6090','#ffad57','#fff178','#73f7a7','#66e5ff','#9292ff','#ec80ff'].forEach((color,i)=>gradient.addColorStop(i/6,color));
  return gradient;
}
/** Tint only already drawn trail pixels; never recolor the world or the solid weapon. */
export function tintRainbowTrail(context,width,height){
  context.save();context.globalAlpha=1;context.globalCompositeOperation='source-atop';
  context.fillStyle=rainbowTrailGradient(context,0,height,width,0);context.fillRect(0,0,width,height);context.restore();
}

/** Recolor plasma while retaining its alpha falloff and pale luminous highlights. */
export function rainbowPlasmaColor(value,hue){
  const palette=[[255,75,90],[255,190,55],[200,255,70],[55,255,150],[65,195,255],[180,95,255]];
  const phase=((hue%360)+360)%360/60,index=Math.floor(phase),t=phase-index;
  const color=palette[index].map((v,i)=>v+(palette[(index+1)%6][i]-v)*t);
  const recolor=(r,g,b)=>{
    const bright=Math.max(+r,+g,+b)/255,white=Math.max(0,(Math.min(+r,+g,+b)-180)/75)*.65;
    return color.map(v=>Math.round((v*(1-white)+255*white)*bright));
  };
  if(value.startsWith('#'))return '#'+recolor(parseInt(value.slice(1,3),16),parseInt(value.slice(3,5),16),parseInt(value.slice(5,7),16)).map(v=>v.toString(16).padStart(2,'0')).join('')+value.slice(7);
  return value.replace(/(rgba?\()(\d+),(\d+),(\d+)/,(_,prefix,r,g,b)=>prefix+recolor(r,g,b).join(','));
}
