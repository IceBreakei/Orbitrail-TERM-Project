import { decagrammatonReferenceStrokes } from './decagrammaton-ultimate.js';
import { segmentPlanaPattern } from './plana-pattern.js';
import { drawingModelImage, drawingBounds, normalizeSkillStrokes } from './skill-drawing.js';
import { drawingAccuracy, skillDamageMultiplier, planaReferenceStrokes } from './skill-accuracy.js';
import { skillCastSettings, luminousNovaSkillSettings } from './game-config.js';

/** Require interior ink in both symbol regions before allowing CLIP to rescue rough geometry. */
function hasBothSymbols(strokes) {
  const b = drawingBounds(strokes);
  if (!b) return false;
  const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
  const w = b.right - b.left, h = b.bottom - b.top;
  if (!(w > 0) || !(h > 0)) return false;
  const inner = strokes.flat().filter(p => Math.hypot((p.x-cx)/(w/2), (p.y-cy)/(h/2)) < .76);
  return inner.some(p => p.y < cy && p.x < cx-w*.04) &&
    inner.some(p => p.y < cy && p.x > cx+w*.04) &&
    inner.some(p => p.y > cy && p.x < cx-w*.04) &&
    inner.some(p => p.y > cy && p.x > cx+w*.04);
}

/** Combine full-symbol CLIP, isolated QuickDraw parts and forgiving spatial validation. */
export async function recognizeWeaponPattern(strokes, weapon, recognizer, isCurrent = () => true) {
  if(!isCurrent())return {valid:false,cancelled:true};
  if(weapon?.id==='decagrammaton-ultimate'){
    const accuracy=drawingAccuracy(strokes,decagrammatonReferenceStrokes());
    const valid=accuracy>=.72;return {valid,skillId:'decagrammaton-ultimate',label:'Activate Protocol SUPERNOVA',score:accuracy,accuracy,matchAccuracy:accuracy,damageMultiplier:1,reason:valid?undefined:'Draw a square overlaid with a diamond.'};
  }
  if(weapon?.id==='decagrammaton')return recognizePrincessKeyPattern(strokes,recognizer,isCurrent);
  if(weapon?.id==='princess-key')return recognizePrincessKeyPattern(strokes,recognizer,isCurrent);
  if (weapon?.id === 'maid-force') return recognizeSqueekyCleanPattern(strokes,isCurrent);
  if (weapon?.id === 'bad-cooking') return recognizeBadCookingPattern(strokes,isCurrent);
  if (weapon?.id === 'moustache-medal') return recognizePrstHonarsPattern(strokes,isCurrent);
  if (weapon?.id === 'cheering-balloons') return recognizeBoundyBloonsPattern(strokes,isCurrent);
  if (weapon?.id === 'saint-predator') return recognizeHolyResonancePattern(strokes,isCurrent);
  if (weapon?.id === 'bean-bag-bomb') return recognizeNuclearBeanPattern(strokes,isCurrent);
  if (weapon?.id === 'serve') return recognizeReturnThisPattern(strokes,isCurrent);
  if (weapon?.id === 'time-to-surf') return recognizeRidingWavesPattern(strokes,isCurrent);
  if (weapon?.id === 'wakamo-bayonet') return recognizeBayonetChargePattern(strokes,isCurrent);
  if (weapon?.id === 'orbital-compass') return recognizeOrbitalCompassPattern(strokes,isCurrent);
  if (weapon?.id === 'water-dousing') return recognizeSplashPattern(strokes,isCurrent);
  if (weapon?.id === 'student-handbook') return recognizeStrictRulesPattern(strokes,isCurrent);
  if (weapon?.id === 'throwing-cards') return recognizeSkilledThrowPattern(strokes,isCurrent);
  if (weapon?.id === 'molotov-cocktail') return recognizeMolotovPattern(strokes,isCurrent);
  if (weapon?.id === 'luminous-nova') return recognizeLuminousNovaPattern(strokes,recognizer,isCurrent);
  if (weapon?.id === 'aris-laser') return recognizeSupernovaPattern(strokes, recognizer, isCurrent);
  if (weapon?.id !== 'plana-umbrella') return { valid: false, reason: 'No drawing skill is defined for this weapon yet.' };
  if(recognizeStrictRulesPattern(strokes).valid)return {valid:false,reason:'This is the Strict Rules circle-and-plus pattern, not Umbrella.'};
  // CLIP can confuse overlapping frames with Umbrella's enclosing circle. Local geometry wins.
  if(linkedFrameEvidence(strokes))return {valid:false,reason:'This is a linked-frame pattern, not Umbrella.'};
  if (!isCurrent()) return { valid: false, cancelled: true };
  strokes = normalizeSkillStrokes(strokes);
  const pattern = segmentPlanaPattern(strokes);
  const accuracy = drawingAccuracy(strokes);
  let clipPredictions = [], clipError;
  try {
    if (recognizer.recognizeSymbol) clipPredictions = await recognizer.recognizeSymbol(drawingModelImage(strokes));
  } catch (error) {
    // Download/inference failure must not disable an otherwise recognized geometric cast.
    clipError = error.message;
  }
  if (!isCurrent()) return { valid: false, cancelled: true };
  const clipMatch = clipPredictions[0]?.label === 'a hand drawn circle enclosing an arrow above an X cross' &&
    clipPredictions[0].score >= skillCastSettings.clipMinimumScore;
  const rescued = clipMatch && accuracy >= skillCastSettings.referenceMinimum && hasBothSymbols(strokes);
  if (!pattern.valid && !rescued) return { ...pattern, clipPredictions, accuracy };
  const components = [];
  // When geometry cannot reliably split rough ink, ask QuickDraw about the whole sketch.
  const parts = pattern.valid ? pattern.parts : [{ name: 'whole pattern', strokes }];
  for (const part of parts) {
    if (!isCurrent()) return { valid: false, cancelled: true };
    try {
      const predictions = await recognizer.recognize(drawingModelImage(part.strokes));
      components.push({ name: part.name, predictions });
    } catch (error) {
      components.push({ name: part.name, predictions: [], error: error.message });
    }
  }
  if (!isCurrent()) return { valid: false, cancelled: true };
  return { valid: true, skillId: 'plana-umbrella-launch', label: 'Plana: Umbrella Launch',
    score: pattern.valid ? pattern.score : clipPredictions[0].score,
    accuracy, damageMultiplier: skillDamageMultiplier(accuracy), components, clipPredictions, clipError };
}


/** Let the drawing identify a ready EX skill; autoattacks never require weapon selection. */
export async function recognizeLoadoutPattern(strokes, skills, recognizer, isCurrent = () => true) {
 if(!isCurrent())return {valid:false,cancelled:true};
 const decision=analyzeSkillDrawing(strokes);
 if(!isCurrent())return {valid:false,cancelled:true};
 if(!decision.valid)return decision;
 const weapon=skills.find(w=>decision.ids.includes(w.id));
 if(!weapon||weapon.skillCooldownRemaining>0)return {valid:false,reason:'That skill is not equipped or is on cooldown. No other skill was selected.'};
 return {...decision,weapon};
}


/** Three crown spikes with open underside; a diamond sits above the crown. */
export function supernovaReferenceStrokes() {
  const path = points => points.map(([x,y]) => ({x,y}));
  return [path([[45,165],[35,110],[67.5,142],[100,110],[132.5,142],[165,110],[155,165]]),
    path([[100,25],[126,60],[100,95],[74,60],[100,25]])];
}

/** Geometric whole-symbol matching plus isolated QuickDraw assistance, with offline fallback. */
export async function recognizeSupernovaPattern(strokes, recognizer, isCurrent) {
  const normalized = normalizeSkillStrokes(strokes);
  const bounds = drawingBounds(normalized);
  if (!bounds) return {valid:false,reason:'Draw the Supernova pattern.'};
  const width = bounds.right-bounds.left, height = bounds.bottom-bounds.top;
  const split = bounds.top + height*.53;
  const upper = normalized.map(stroke=>stroke.filter(p=>p.y<split)).filter(s=>s.length);
  const lower = normalized.map(stroke=>stroke.filter(p=>p.y>=split)).filter(s=>s.length);
  const diamondBounds=drawingBounds(upper), crownBounds=drawingBounds(lower);
  // The narrow diamond sits above the wider crown; reject enclosing circles/partial symbols.
  if (!diamondBounds || !crownBounds || diamondBounds.right-diamondBounds.left>width*.75 ||
      crownBounds.right-crownBounds.left<width*.75 || diamondBounds.bottom-diamondBounds.top<height*.25) {
    return {valid:false,reason:'Draw a diamond above an open-bottom three-spike crown.'};
  }
  const accuracy = drawingAccuracy(strokes,supernovaReferenceStrokes());
  if (accuracy < .62) return {valid:false, reason:'Draw an open-bottom three-spike crown and a diamond.'};
  const components = [];
  for (const stroke of normalizeSkillStrokes(strokes)) {
    if (!isCurrent()) return {valid:false,cancelled:true};
    try { components.push({name:'Supernova component',predictions:await recognizer.recognize(drawingModelImage([stroke]))}); }
    catch { /* Local reference remains available when model inference is offline. */ }
  }
  return {valid:true,skillId:'supernova-beam',label:'Supernova',score:accuracy,accuracy,
    damageMultiplier:skillDamageMultiplier(accuracy),components};
}


/** Choose a cancellation target locally; empty/unrelated ink never selects a default slot. */
export function closestDrawingSkill(strokes, skills) {
 const decision=analyzeSkillDrawing(strokes);
 if(!decision.valid)return null;
 return skills.find(w=>decision.ids.includes(w.id)&&!(w.skillCooldownRemaining>0))||null;
}


/** A circle enclosing a centered diamond; scale, stroke order and direction are unrestricted. */
export function luminousNovaReferenceStrokes() {
  return [Array.from({length:97},(_,i)=>({x:100+90*Math.cos(i/96*Math.PI*2),y:100+90*Math.sin(i/96*Math.PI*2)})),
    [[100,48],[152,100],[100,152],[48,100],[100,48]].map(([x,y])=>({x,y}))];
}

/** Vertically flipped triangle: left lower, right higher, third projecting upward between both. */
export function princessKeyReferenceStrokes() {
  const box=(left,top,right,bottom)=>[[left,top],[right,top],[right,bottom],[left,bottom],[left,top]].map(([x,y])=>({x,y}));
  return [box(15,90,115,190),box(95,70,195,170),box(55,10,155,110)];
}

/** Recognize closed, mostly horizontal/vertical frames without requiring exact reference spacing. */
export function linkedFrameEvidence(strokes) {
  const normalized=normalizeSkillStrokes(strokes);let frames=0,total=0,aligned=0;const frameBounds=[];
  for(const stroke of normalized) {
    if(stroke.length<4)continue;
    const bounds=drawingBounds([stroke]);if(!bounds)continue;
    const width=bounds.right-bounds.left,height=bounds.bottom-bounds.top;
    let length=0,axis=0;
    for(let i=1;i<stroke.length;i++) {
      const dx=Math.abs(stroke[i].x-stroke[i-1].x),dy=Math.abs(stroke[i].y-stroke[i-1].y),distance=Math.hypot(dx,dy);
      length+=distance;if(Math.min(dx,dy)<=Math.max(dx,dy)*.45)axis+=distance;
    }
    total+=length;aligned+=axis;
    const endGap=Math.hypot(stroke[0].x-stroke.at(-1).x,stroke[0].y-stroke.at(-1).y);
    if(width>=20&&height>=20&&endGap<Math.hypot(width,height)*.3&&axis/Math.max(1,length)>.65&&length>1.5*(width+height)){frames++;frameBounds.push(bounds);}
  }
  const interlocked=frameBounds.some((a,i)=>frameBounds.filter((b,j)=>i!==j&&
    Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)).length>=2);
  return frames>=3&&interlocked&&total>0&&aligned/total>.65;
}

/** Reference matching is scale/stroke-order independent; QuickDraw supplies supporting shape predictions. */
export async function recognizePrincessKeyPattern(strokes,recognizer,isCurrent=()=>true) {
  const accuracy=drawingAccuracy(strokes,princessKeyReferenceStrokes()),frames=linkedFrameEvidence(strokes);
  if(accuracy<.88&&!frames)return {valid:false,reason:'Draw three interlocking squares.'};
  const components=[];
  try{components.push({name:'linked rectangles',predictions:await recognizer?.recognize(drawingModelImage(strokes))});}catch{}
  if(!isCurrent())return {valid:false,cancelled:true};
  return {valid:true,skillId:'princess-key-ex',label:'The Princess and the Key',score:Math.max(accuracy,frames ? .8 : 0),accuracy,matchAccuracy:Math.max(accuracy,frames ? .85 : 0),
    damageMultiplier:skillDamageMultiplier(accuracy),components};
}

/** Separate enclosing ink from diamond ink before combining forgiving geometry and AI assistance. */
export async function recognizeLuminousNovaPattern(strokes,recognizer,isCurrent=()=>true) {
  const normalized=normalizeSkillStrokes(strokes),points=[];
  for(const stroke of normalized)for(let i=1;i<stroke.length;i++) {
    const a=stroke[i-1],b=stroke[i],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/3));
    for(let j=0;j<=count;j++)points.push({x:a.x+(b.x-a.x)*j/count,y:a.y+(b.y-a.y)*j/count});
  }
  if(!points.length)return {valid:false,reason:'Draw a circle with a diamond inside.'};
  const radius=p=>Math.hypot((p.x-100)/100,(p.y-100)/100);
  const outer=points.filter(p=>radius(p)>.87),inner=points.filter(p=>radius(p)<.84);
  const sectors=new Set(outer.map(p=>(Math.floor((Math.atan2(p.y-100,p.x-100)+Math.PI)/Math.PI*4)+8)%8));
  const bounds=drawingBounds([inner]);
  if(sectors.size<7||!bounds||bounds.right-bounds.left<40||bounds.bottom-bounds.top<40)return {valid:false,reason:'Draw an enclosing circle and a centered diamond.'};
  const cx=(bounds.left+bounds.right)/2,cy=(bounds.top+bounds.bottom)/2;
  const rx=(bounds.right-bounds.left)/2,ry=(bounds.bottom-bounds.top)/2;
  const error=inner.reduce((sum,p)=>sum+Math.abs(Math.abs(p.x-cx)/rx+Math.abs(p.y-cy)/ry-1),0)/inner.length;
  if(Math.abs(cx-100)>25||Math.abs(cy-100)>25||error>.23)return {valid:false,reason:'Draw a diamond outline inside the circle.'};
  const accuracy=drawingAccuracy(strokes,luminousNovaReferenceStrokes());
  if(accuracy<luminousNovaSkillSettings.patternMinimumAccuracy)return {valid:false,reason:'Complete the circle and diamond.'};
  const components=[];
  for(const [name,ink] of [['circle',outer],['diamond',inner]]) {
    if(!isCurrent())return {valid:false,cancelled:true};
    try{components.push({name,predictions:await recognizer?.recognize(drawingModelImage([ink]))});}catch{}
  }
  if(!isCurrent())return {valid:false,cancelled:true};
  return {valid:true,skillId:'luminous-nova-aura',label:'Luminous Nova',score:accuracy,accuracy,damageMultiplier:1,components};
}

/** Circle enclosing a pointed, asymmetric flame with a rounded lower body. */
export function molotovReferenceStrokes(){return [Array.from({length:97},(_,i)=>({x:100+90*Math.cos(i/96*Math.PI*2),y:100+90*Math.sin(i/96*Math.PI*2)})),[[100,43],[104,77],[119,65],[123,88],[139,108],[140,125],[132,143],[117,155],[98,160],[80,153],[66,140],[61,123],[64,106],[76,84],[79,106],[90,86],[100,43]].map(([x,y])=>({x,y}))];}
export function recognizeMolotovPattern(strokes,isCurrent=()=>true){
 if(!isCurrent())return {valid:false,cancelled:true};
 const normalized=normalizeSkillStrokes(strokes),inner=normalized.flat().filter(p=>Math.hypot(p.x-100,p.y-100)<72),bounds=drawingBounds([inner]);
 const accuracy=drawingAccuracy(strokes,molotovReferenceStrokes()),diamondAccuracy=drawingAccuracy(strokes,luminousNovaReferenceStrokes());
 const valid=Boolean(bounds&&bounds.right-bounds.left>=40&&bounds.bottom-bounds.top>=65&&accuracy>=.7&&accuracy>diamondAccuracy+.025);
 return {valid,skillId:'molotov-ex',label:'ARSON!',score:accuracy,accuracy,matchAccuracy:accuracy,damageMultiplier:1,reason:valid?undefined:'Draw a circle with a fire symbol inside.'};
}

/** Diagonal L-shaped outline matching the supplied casting-symbol reference. */
export function skilledThrowReferenceStrokes(){return [[[95,18],[144,58],[103,110],[151,151],[112,194],[10,119],[95,18]].map(([x,y])=>({x,y}))];}
export function recognizeSkilledThrowPattern(strokes,isCurrent=()=>true){
 if(!isCurrent())return {valid:false,cancelled:true};
 const accuracy=drawingAccuracy(strokes,skilledThrowReferenceStrokes());
 const valid=accuracy>=.72;
 return {valid,skillId:'skilled-throw',label:'Skilled Throw',score:accuracy,accuracy,matchAccuracy:accuracy,damageMultiplier:1,reason:valid?undefined:'Draw the diagonal L-shaped outline.'};
}

/** Circle enclosing an upright plus sign. */
export function strictRulesReferenceStrokes(){return [Array.from({length:97},(_,i)=>({x:100+90*Math.cos(i/96*Math.PI*2),y:100+90*Math.sin(i/96*Math.PI*2)})),[{x:55,y:100},{x:145,y:100}],[{x:100,y:55},{x:100,y:145}]];}
export function recognizeStrictRulesPattern(strokes,isCurrent=()=>true){
 if(!isCurrent())return {valid:false,cancelled:true};
 const normalized=normalizeSkillStrokes(strokes),points=normalized.flat(),accuracy=drawingAccuracy(strokes,strictRulesReferenceStrokes());
 const sectors=new Set(points.filter(p=>Math.hypot(p.x-100,p.y-100)>82).map(p=>Math.floor((Math.atan2(p.y-100,p.x-100)+Math.PI)/(Math.PI/4))%8));
 let horizontal=false,vertical=false;
 for(const original of normalized){const stride=Math.max(1,Math.ceil(original.length/64)),stroke=original.filter((_,i)=>i%stride===0||i===original.length-1);for(let i=0;i<stroke.length;i++){
  const a=stroke[i];if(Math.hypot(a.x-100,a.y-100)>80)continue;
  for(let j=i+1;j<stroke.length;j++){const b=stroke[j],dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy;if(length2<900)continue;if(Math.hypot(b.x-100,b.y-100)>80)continue;
   let straight=true;for(let k=i+1;k<j;k++)if(Math.abs((stroke[k].x-a.x)*dy-(stroke[k].y-a.y)*dx)/Math.sqrt(length2)>10){straight=false;break;}if(!straight)continue;
   const t=Math.max(0,Math.min(1,((100-a.x)*dx+(100-a.y)*dy)/length2));if(Math.hypot(a.x+dx*t-100,a.y+dy*t-100)>35)continue;
   if(Math.abs(dx)>Math.abs(dy)*1.3)horizontal=true;if(Math.abs(dy)>Math.abs(dx)*1.3)vertical=true;
  }
 }
 }
 const valid=Boolean(sectors.size>=7&&horizontal&&vertical&&accuracy>=.6);
 return {valid,skillId:'strict-rules',label:'Strict Rules',score:accuracy,accuracy,matchAccuracy:accuracy,damageMultiplier:1,reason:valid?undefined:'Draw a circle with a + sign inside.'};
}

/** Upward arrow above a water droplet. */
export function splashReferenceStrokes(){return [[{x:100,y:68},{x:100,y:18}],[{x:75,y:43},{x:100,y:18},{x:125,y:43}],[[100,88],[123,117],[140,144],[143,160],[137,178],[122,190],[100,194],[78,190],[63,178],[57,160],[60,144],[77,117],[100,88]].map(([x,y])=>({x,y}))];}
export function recognizeSplashPattern(strokes,isCurrent=()=>true){if(!isCurrent())return {valid:false,cancelled:true};const normalized=normalizeSkillStrokes(strokes),upper=normalized.map(s=>s.filter(p=>p.y<65)).filter(s=>s.length),lower=normalized.map(s=>s.filter(p=>p.y>72)).filter(s=>s.length),top=drawingBounds(upper),drop=drawingBounds(lower),accuracy=drawingAccuracy(strokes,splashReferenceStrokes());const valid=Boolean(top&&drop&&top.bottom-top.top>=40&&top.right-top.left>=35&&drop.bottom-drop.top>=80&&accuracy>=.72);return {valid,skillId:'splash-ex',label:'Water Fight!',score:accuracy,accuracy,matchAccuracy:accuracy,damageMultiplier:1,reason:valid?undefined:'Draw a water droplet with an upward arrow above it.'};}

/** Saturn: a round planet overlaid with a wider, shallow closed ring. */
export function orbitalCompassReferenceStrokes(){return [Array.from({length:65},(_,i)=>({x:100+55*Math.cos(i*Math.PI/32),y:100+55*Math.sin(i*Math.PI/32)})),Array.from({length:65},(_,i)=>({x:100+94*Math.cos(i*Math.PI/32),y:100+25*Math.sin(i*Math.PI/32)}))];}
export function recognizeOrbitalCompassPattern(strokes,isCurrent=()=>true){
 if(!isCurrent())return {valid:false,cancelled:true};
 const shapes=strokes.filter(s=>s.length>=8).map(s=>{const b=drawingBounds([s]),w=b.right-b.left,h=b.bottom-b.top;return {w,h,x:(b.left+b.right)/2,y:(b.top+b.bottom)/2,closed:Math.hypot(s[0].x-s.at(-1).x,s[0].y-s.at(-1).y)<Math.max(w,h)*.3&&s.reduce((sum,p)=>sum+Math.abs(Math.hypot((p.x-(b.left+b.right)/2)/(w/2||1),(p.y-(b.top+b.bottom)/2)/(h/2||1))-1),0)/s.length<.12};});
 const valid=shapes.some(p=>p.closed&&p.w/p.h>.65&&p.w/p.h<1.45&&shapes.some(r=>r!==p&&r.closed&&r.w>p.w*1.3&&((r.h<p.h*.8&&r.h>p.h*.15)||(r.h>p.h*1.3&&r.w/r.h>.65&&r.w/r.h<1.45))&&Math.hypot(r.x-p.x,r.y-p.y)<p.w*.35));
 const accuracy=drawingAccuracy(strokes,orbitalCompassReferenceStrokes());
 return {valid,skillId:'orbital-compass-ex',label:'This Direction?',score:accuracy,accuracy,matchAccuracy:accuracy,damageMultiplier:1,reason:valid?undefined:'Draw a circle with an oval ring like Saturn.'};
}

export function bayonetChargeReferenceStrokes(){return [[100,20],[45,110],[155,110]].flatMap(([x,y])=>[[{x,y:y+60},{x,y}],[{x:x-22,y:y+22},{x,y},{x:x+22,y:y+22}]]);}
/** Validate each arrow locally so varying shaft lengths do not spoil whole-image similarity. */
export function recognizeBayonetChargePattern(strokes,isCurrent=()=>true){
 if(!isCurrent())return {valid:false,cancelled:true};
 const normalized=normalizeSkillStrokes(strokes),groups=[[],[],[]];
 for(const stroke of normalized){const b=drawingBounds([stroke]);if(!b)continue;const cx=(b.left+b.right)/2;groups[cx<65?1:cx>135?2:0].push(stroke);}
 function arrow(group){
  const b=drawingBounds(group);if(!b)return null;const w=b.right-b.left,h=b.bottom-b.top;if(w<18||h<35||h<w*.85)return null;
  const points=[];for(const stroke of group){for(let i=1;i<stroke.length;i++){const a=stroke[i-1],z=stroke[i],n=Math.max(1,Math.ceil(Math.hypot(z.x-a.x,z.y-a.y)/3));for(let j=0;j<=n;j++)points.push({x:a.x+(z.x-a.x)*j/n,y:a.y+(z.y-a.y)*j/n});}}
  const cx=(b.left+b.right)/2,tip=points.filter(p=>p.y<=b.top+h*.08&&Math.abs(p.x-cx)<w*.3).sort((a,b)=>a.y-b.y)[0];
  if(!tip)return null;
  const wing=p=>p.y>b.top+h*.08&&p.y<b.top+h*.52;
  const left=points.some(p=>wing(p)&&p.x<tip.x-w*.25),right=points.some(p=>wing(p)&&p.x>tip.x+w*.25);
  const shaft=points.some(p=>p.y>b.top+h*.85&&Math.abs(p.x-tip.x)<w*.4);
  return left&&right&&shaft?{x:tip.x,y:tip.y}:null;
 }
 const [top,left,right]=groups.map(arrow),geometry=Boolean(top&&left&&right&&top.y+20<Math.min(left.y,right.y)&&left.x+25<top.x&&top.x+25<right.x&&Math.abs(left.y-right.y)<65);
 const accuracy=drawingAccuracy(strokes,bayonetChargeReferenceStrokes()),valid=geometry;
 return {valid,skillId:'bayonet-charge',label:'Charge!',score:accuracy,accuracy,matchAccuracy:geometry?Math.max(.8,accuracy):accuracy,damageMultiplier:1,reason:valid?undefined:'Draw 3 upward arrows in a triangle.'};
}

/** Mouse-drawing safety: bounded jitter tolerance, component coverage and global rivals.
 * Always compare against every symbol, including unavailable/cooling-down skills.
 * AI predictions cannot override this decision or pick a substitute skill.
 */
let bufferedSkillCatalog;
function skillDrawingCatalog(){
 if(bufferedSkillCatalog)return bufferedSkillCatalog;
 const ultimate=()=>typeof decagrammatonReferenceStrokes==='function'?decagrammatonReferenceStrokes():[[[40,40],[160,40],[160,160],[40,160],[40,40]],[[100,15],[185,100],[100,185],[15,100],[100,15]]].map(s=>s.map(([x,y])=>({x,y})));
 const definitions=[
  [['plana-umbrella'],'plana-umbrella-launch','Plana: Umbrella Launch',planaReferenceStrokes,strokes=>segmentPlanaPattern(strokes).valid,true],
  [['aris-laser'],'supernova-beam','Supernova',supernovaReferenceStrokes,null,true],
  [['luminous-nova'],'luminous-nova-aura','Luminous Nova',luminousNovaReferenceStrokes],
  [['princess-key','decagrammaton'],'princess-key-ex','The Princess and the Key',princessKeyReferenceStrokes,linkedFrameEvidence,true],
  [['decagrammaton-ultimate'],'decagrammaton-ultimate','Activate Protocol SUPERNOVA',ultimate],
  [['molotov-cocktail'],'molotov-ex','ARSON!',molotovReferenceStrokes,strokes=>recognizeMolotovPattern(strokes).valid],
  [['throwing-cards'],'skilled-throw','Skilled Throw',skilledThrowReferenceStrokes],
  [['student-handbook'],'strict-rules','Strict Rules',strictRulesReferenceStrokes,strokes=>recognizeStrictRulesPattern(strokes).valid],
  [['water-dousing'],'splash-ex','Water Fight!',splashReferenceStrokes],
  [['orbital-compass'],'orbital-compass-ex','This Direction?',orbitalCompassReferenceStrokes,strokes=>recognizeOrbitalCompassPattern(strokes).valid],
  [['time-to-surf'],'riding-waves','Riding Waves',ridingWavesReferenceStrokes],
  [['serve'],'return-this','Return This!',returnThisReferenceStrokes,strokes=>returnThisAxes(strokes).size===4&&recognizeStrictRulesPattern(strokes).valid],
  [['bean-bag-bomb'],'nuclear-bean-bag','Nuclear Bean Bag',nuclearBeanReferenceStrokes],
  [['saint-predator'],'holy-resonance','Holy Resonance',holyResonanceReferenceStrokes,holyMissileEvidence],
  [['cheering-balloons'],'boundy-bloons','Boundy Bloons',boundyBloonsReferenceStrokes,nestedCircleEvidence],
  [['moustache-medal'],'prst-honars','PRST Honars',prstHonarsReferenceStrokes],
  [['bad-cooking'],'bad-cooking-ex','You really are bad at cooking',badCookingReferenceStrokes,knifeEvidence],
  [['maid-force'],'squeeky-clean','Squeeky Clean',squeekyCleanReferenceStrokes],
  [['wakamo-bayonet'],'bayonet-charge','Charge!',bayonetChargeReferenceStrokes,strokes=>recognizeBayonetChargePattern(strokes).valid]
 ];
 bufferedSkillCatalog=definitions.map(([ids,skillId,label,reference,geometry,scaled])=>{const strokes=normalizeSkillStrokes(reference());const entry={ids,skillId,label,reference,geometry,scaled,parts:strokes.map(s=>sampleBufferedInk([s],24)),points:sampleBufferedInk(strokes,160)};if(skillId==='riding-waves')entry.alternatives=[1,2,3].flatMap(cycles=>[-1,1].map(phase=>{const wave=normalizeSkillStrokes(ridingWavesReferenceStrokes(cycles,phase));return {parts:wave.map(s=>sampleBufferedInk([s],24)),points:sampleBufferedInk(wave,160)};}));return entry;});
 return bufferedSkillCatalog;
}
function sampleBufferedInk(strokes,budget=160){
 const segments=[];let total=0;
 for(const stroke of strokes)for(let i=1;i<stroke.length;i++){const a=stroke[i-1],b=stroke[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(length){segments.push({a,b,length});total+=length;}}
 if(!total)return [];
 const points=[];let segment=0,offset=0;
 for(let i=0;i<budget;i++){const distance=total*(i+.5)/budget;while(segment<segments.length-1&&offset+segments[segment].length<distance){offset+=segments[segment++].length;}const {a,b,length}=segments[segment],t=(distance-offset)/length;points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}return points;
}
function bufferedNearest(point,cloud){let best=Infinity;for(const other of cloud){const d=(point.x-other.x)**2+(point.y-other.y)**2;if(d<best)best=d;}return Math.sqrt(best);}
function bufferedInkMetrics(actual,entry){
 const forward=actual.map(p=>bufferedNearest(p,entry.points)),back=entry.points.map(p=>bufferedNearest(p,actual));
 // Four normalized pixels of free jitter; both directions must cover the whole symbol.
 const mean=values=>values.reduce((sum,d)=>sum+Math.max(0,d-4),0)/values.length;
 const score=Math.max(0,1-(mean(forward)+mean(back))/2/24);
 const coverage=entry.parts.every(part=>part.filter(p=>bufferedNearest(p,actual)<=18).length/part.length>=.7);
 const extra=forward.filter(d=>d>20).length/forward.length;
 return {score,coverage,extra};
}
const bufferedDrawingDecisions=new Map();
export function analyzeSkillDrawing(strokes){
 const key=JSON.stringify(strokes.map(s=>s.map(p=>[Math.round(p.x*100),Math.round(p.y*100)])));
 if(bufferedDrawingDecisions.has(key))return bufferedDrawingDecisions.get(key);
 const result=evaluateSkillDrawing(strokes);bufferedDrawingDecisions.set(key,result);
 if(bufferedDrawingDecisions.size>8)bufferedDrawingDecisions.delete(bufferedDrawingDecisions.keys().next().value);
 return result;
}
function bufferedFrameSignature(strokes){
 let axis=0,diagonal=0,closed=0,openWaves=0;
 for(const stroke of strokes){const b=drawingBounds([stroke]);if(!b||stroke.length<4)continue;const w=b.right-b.left,h=b.bottom-b.top;if(w<25||h<15)continue;
  if(Math.hypot(stroke[0].x-stroke.at(-1).x,stroke[0].y-stroke.at(-1).y)>Math.hypot(w,h)*.3){
   if(w>h*.9&&Math.abs(stroke[0].x-stroke.at(-1).x)>w*.7){const points=sampleBufferedInk([stroke],24);let sign=0,turns=0;for(let i=1;i<points.length;i++){const dy=points[i].y-points[i-1].y;if(Math.abs(dy)<h*.025)continue;const next=Math.sign(dy);if(sign&&sign!==next)turns++;sign=next;}if(turns>=2)openWaves++;}continue;
  }
  if(h<25)continue;
  const points=sampleBufferedInk([stroke],24);let total=0,aligned=0;for(let i=1;i<points.length;i++){const dx=Math.abs(points[i].x-points[i-1].x),dy=Math.abs(points[i].y-points[i-1].y),length=Math.hypot(dx,dy);total+=length;if(Math.min(dx,dy)<Math.max(dx,dy)*.45)aligned+=length;}
  const ratio=aligned/Math.max(1,total);closed++;if(ratio>.7)axis++;if(ratio<.25)diagonal++;
 }return {axis,diagonal,closed,openWaves};
}
function evaluateSkillDrawing(strokes){
 const fail=reason=>({valid:false,reason});
 if(!drawingBounds(strokes))return fail('Draw a complete skill symbol.');
 const normalized=normalizeSkillStrokes(strokes),clean=normalized.filter(s=>sampleBufferedInk([s],8).length&&s.reduce((sum,p,i)=>sum+(i?Math.hypot(p.x-s[i-1].x,p.y-s[i-1].y):0),0)>5);
 if(!clean.length)return fail('Draw a complete skill symbol.');
 const base=sampleBufferedInk(clean,160),catalog=skillDrawingCatalog(),frames=bufferedFrameSignature(clean),crossAxes=returnThisAxes(clean);
 const variants=[-15,-10,-5,0,5,10,15].map(degrees=>{const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);return base.map(p=>({x:100+(p.x-100)*c-(p.y-100)*s,y:100+(p.x-100)*s+(p.y-100)*c}));});
 const ranked=catalog.map(entry=>{
  let best={score:0,coverage:false,extra:1},complete=null,votes=0;
  for(const actual of variants){const metric=(entry.alternatives||[entry]).map(reference=>bufferedInkMetrics(actual,reference)).sort((a,b)=>b.score-a.score)[0];if(metric.score>best.score)best=metric;if(metric.coverage&&metric.extra<=.2&&metric.score>=.7){votes++;if(!complete||metric.score>complete.score)complete=metric;}}
  best=complete||best;
  const geometry=Boolean(entry.geometry?.(clean));
  return {...entry,...best,geometry,votes,signature:entry.skillId==='luminous-nova-aura'?innerDiamondEvidence(clean):entry.skillId==='strict-rules'?!nestedCircleEvidence(clean,2)&&!crossAxes.has(1)&&!crossAxes.has(3):entry.skillId==='return-this'?crossAxes.size===4&&!segmentPlanaPattern(clean).valid:entry.skillId==='riding-waves'?frames.closed===0:entry.skillId==='orbital-compass-ex'?frames.openWaves===0&&frames.closed<=2:entry.skillId==='boundy-bloons'?nestedCircleEvidence(clean):entry.skillId==='bayonet-charge'?frames.closed===0:entry.skillId==='princess-key-ex'?frames.diagonal===0:entry.skillId==='decagrammaton-ultimate'?frames.closed<=2:true,confidence:entry.skillId==='bad-cooking-ex'&&geometry?1.08:entry.skillId==='orbital-compass-ex'&&nestedCircleEvidence(clean,2)?1.08:best.score+(geometry ? ((entry.skillId==='princess-key-ex'&&frames.diagonal===0)||(entry.skillId==='orbital-compass-ex'&&nestedCircleEvidence(clean,2)) ? .2 : .06) : 0)};
 }).sort((a,b)=>b.confidence-a.confidence);
 const winner=ranked[0],rival=ranked.find((entry,index)=>index>0&&entry.signature)||{confidence:0};
 // Independent shape evidence can rescue unusual proportions, but never a close rival.
 const qualified=winner.signature&&((winner.coverage&&winner.extra<=.2&&winner.score>=.75&&winner.votes>=2)||(winner.geometry&&winner.score>=.45));
 if(!qualified)return {...fail('The symbol is incomplete or too unclear. Please try again.'),recognitionChecks:{candidate:winner.label,score:winner.score,coverage:winner.coverage,extra:winner.extra,votes:winner.votes}};
 if(winner.confidence-rival.confidence<.07)return fail('Drawing matches more than one skill. Please try again. No cooldown applied.');
 // Refuse a rescue if another complete symbol also has independent structural evidence.
 if(ranked.some(other=>other!==winner&&other.signature&&other.geometry&&other.coverage&&other.score>=winner.score-.07))return fail('Drawing is ambiguous. Please try again. No cooldown applied.');
 const accuracy=drawingAccuracy(strokes,winner.reference());
 return {valid:true,ids:winner.ids,skillId:winner.skillId,label:winner.label,accuracy,score:winner.score,matchAccuracy:winner.confidence,damageMultiplier:winner.scaled?skillDamageMultiplier(accuracy):1,components:[],recognitionChecks:{coverage:winner.coverage,geometry:winner.geometry,votes:winner.votes,margin:winner.confidence-rival.confidence}};
}

export function ridingWavesReferenceStrokes(cycles=2,phase=1){return [Array.from({length:97},(_,i)=>({x:10+180*i/96,y:100-40*phase*Math.sin(i/96*Math.PI*2*cycles)}))];}
export function recognizeRidingWavesPattern(strokes,isCurrent=()=>true){if(!isCurrent())return {valid:false,cancelled:true};const decision=analyzeSkillDrawing(strokes);return decision.skillId==='riding-waves'?decision:{valid:false,reason:'Draw a flowing wave pattern.'};}

export function returnThisReferenceStrokes(){return [strictRulesReferenceStrokes()[0],[{x:55,y:100},{x:145,y:100}],[{x:100,y:55},{x:100,y:145}],[{x:63,y:63},{x:137,y:137}],[{x:137,y:63},{x:63,y:137}]];}
/** Straight opposing strokes through the center distinguish plus, X, and all eight spokes. */
function returnThisAxes(strokes){
 const axes=new Set();for(const original of normalizeSkillStrokes(strokes)){const points=sampleBufferedInk([original],32);for(let i=0;i<points.length;i++){const a=points[i];if(Math.hypot(a.x-100,a.y-100)>78)continue;for(let j=i+1;j<points.length;j++){const b=points[j],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<45||Math.hypot(b.x-100,b.y-100)>78||((a.x-100)*(b.x-100)+(a.y-100)*(b.y-100))>=0)continue;const t=((100-a.x)*dx+(100-a.y)*dy)/(length*length);if(t<.15||t>.85||Math.hypot(a.x+dx*t-100,a.y+dy*t-100)>14)continue;let straight=true;for(let k=i+1;k<j;k++)if(Math.abs((points[k].x-a.x)*dy-(points[k].y-a.y)*dx)/length>10){straight=false;break;}if(straight)axes.add((Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%4);}}}return axes;
}
export function recognizeReturnThisPattern(strokes,isCurrent=()=>true){if(!isCurrent())return {valid:false,cancelled:true};const decision=analyzeSkillDrawing(strokes);return decision.skillId==='return-this'?decision:{valid:false,reason:'Draw a circle enclosing an overlaid X and +.'};}

export function nuclearBeanReferenceStrokes(){return [[[{x:20,y:95},...Array.from({length:33},(_,i)=>({x:100-80*Math.cos(i/32*Math.PI),y:95-65*Math.sin(i/32*Math.PI)})),{x:20,y:95}]],[[{x:75,y:95},{x:75,y:175},{x:125,y:175},{x:125,y:95},{x:75,y:95}]]].flat();}
export function recognizeNuclearBeanPattern(strokes,isCurrent=()=>true){if(!isCurrent())return {valid:false,cancelled:true};const decision=analyzeSkillDrawing(strokes);return decision.skillId==='nuclear-bean-bag'?decision:{valid:false,reason:'Draw a mushroom cap and stem.'};}

export function holyResonanceReferenceStrokes(){return [[[95,12],[55,45],[60,140],[25,145],[25,185],[175,185],[175,135],[140,135],[140,50],[105,12]].map(([x,y])=>({x,y}))];}
export function recognizeHolyResonancePattern(strokes,isCurrent=()=>true){if(!isCurrent())return {valid:false,cancelled:true};const decision=analyzeSkillDrawing(strokes);return decision.skillId==='holy-resonance'?decision:{valid:false,reason:'Draw an upward-pointing missile.'};}

function holyMissileEvidence(strokes){
 const normalized=normalizeSkillStrokes(strokes);
 if(!normalized.some(s=>{const b=drawingBounds([s]);return b&&b.bottom-b.top>150&&Math.hypot(s[0].x-s.at(-1).x,s[0].y-s.at(-1).y)<55;}))return false;
 const points=sampleBufferedInk(normalized,160),tip=points.filter(p=>p.y<15&&p.x>60&&p.x<140).sort((a,b)=>a.y-b.y)[0];if(!tip)return false;
 const middle=drawingBounds([points.filter(p=>p.y>55&&p.y<125)]);if(!middle||middle.right-middle.left>155||middle.right-middle.left<40)return false;
 const nose=points.filter(p=>p.y>tip.y+15&&p.y<tip.y+75),fins=points.filter(p=>p.y>145);
 return nose.some(p=>p.x<tip.x-12)&&nose.some(p=>p.x>tip.x+12)&&fins.some(p=>p.x<55)&&fins.some(p=>p.x>145);
}

export function boundyBloonsReferenceStrokes(){return [90,60,30].map(radius=>Array.from({length:65},(_,i)=>({x:100+radius*Math.cos(i*Math.PI/32),y:100+radius*Math.sin(i*Math.PI/32)})));}
function nestedCircleEvidence(strokes,count=3){const loops=normalizeSkillStrokes(strokes).filter(s=>s.length>=6).map(s=>{const b=drawingBounds([s]);if(!b)return null;const w=b.right-b.left,h=b.bottom-b.top,cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2;if(w<25||h<25||w/h<.65||w/h>1.55||Math.hypot(s[0].x-s.at(-1).x,s[0].y-s.at(-1).y)>Math.hypot(w,h)*.3)return null;const points=sampleBufferedInk([s],48),error=points.reduce((sum,p)=>sum+Math.abs(Math.hypot((p.x-cx)/(w/2),(p.y-cy)/(h/2))-1),0)/points.length;return error<.14?{...b,w,h,cx,cy}:null;}).filter(Boolean).sort((a,b)=>b.w*b.h-a.w*a.h);if(loops.length!==count)return false;return loops.every((loop,i)=>!i||(loop.w<loops[i-1].w*.88&&loop.h<loops[i-1].h*.88&&loop.left>loops[i-1].left-5&&loop.right<loops[i-1].right+5&&loop.top>loops[i-1].top-5&&loop.bottom<loops[i-1].bottom+5));}
export function recognizeBoundyBloonsPattern(strokes,isCurrent=()=>true){if(!isCurrent())return {valid:false,cancelled:true};const decision=analyzeSkillDrawing(strokes);return decision.skillId==='boundy-bloons'?decision:{valid:false,reason:'Draw 3 circles nested inside each other.'};}

function innerDiamondEvidence(strokes){const points=sampleBufferedInk(normalizeSkillStrokes(strokes),200).filter(p=>Math.hypot(p.x-100,p.y-100)<78),b=drawingBounds([points]);if(!b||b.right-b.left<35||b.bottom-b.top<35)return false;const cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2,rx=(b.right-b.left)/2,ry=(b.bottom-b.top)/2;if(Math.abs(cx-100)>28||Math.abs(cy-100)>28)return false;const error=points.reduce((sum,p)=>sum+Math.abs(Math.abs(p.x-cx)/rx+Math.abs(p.y-cy)/ry-1),0)/points.length;return error<.22;}

export function prstHonarsReferenceStrokes(){return [[[25,25],[100,10],[175,25],[170,100],[145,150],[100,190],[55,150],[30,100],[25,25]].map(([x,y])=>({x,y}))];}
export function recognizePrstHonarsPattern(strokes,isCurrent=()=>true){if(!isCurrent())return {valid:false,cancelled:true};const decision=analyzeSkillDrawing(strokes);return decision.skillId==='prst-honars'?decision:{valid:false,reason:'Draw a shield outline.'};}

export function badCookingReferenceStrokes(){return [[[80,30],[190,30],[190,150],[80,150],[80,30]],[[80,30],[10,15],[10,70],[80,70],[80,30]]].map(s=>s.map(([x,y])=>({x,y})));}
export function recognizeBadCookingPattern(strokes,isCurrent=()=>true){if(!isCurrent())return {valid:false,cancelled:true};const decision=analyzeSkillDrawing(strokes);return decision.skillId==='bad-cooking-ex'?decision:{valid:false,reason:'Draw a rectangular cleaver blade with a small handle to its left.'};}

function knifeEvidence(strokes){const clean=normalizeSkillStrokes(strokes);if(clean.length!==2)return false;const boxes=clean.map(stroke=>{const b=drawingBounds([stroke]);if(!b||Math.hypot(stroke[0].x-stroke.at(-1).x,stroke[0].y-stroke.at(-1).y)>55)return null;return {...b,w:b.right-b.left,h:b.bottom-b.top};});if(boxes.some(b=>!b))return false;boxes.sort((a,b)=>b.w*b.h-a.w*a.h);const [blade,handle]=boxes;return blade.h>100&&blade.w>75&&handle.w>35&&handle.h>25&&handle.h<blade.h*.7&&handle.left<blade.left-25&&Math.abs(handle.right-blade.left)<35&&handle.top<blade.top+35&&handle.bottom<blade.bottom-35;}

export function squeekyCleanReferenceStrokes(){return [Array.from({length:6},(_,i)=>{const a=-Math.PI/2+i*4*Math.PI/5;return {x:100+90*Math.cos(a),y:100+90*Math.sin(a)};})];}
export function recognizeSqueekyCleanPattern(strokes,isCurrent=()=>true){if(!isCurrent())return {valid:false,cancelled:true};const decision=analyzeSkillDrawing(strokes);return decision.skillId==='squeeky-clean'?decision:{valid:false,reason:'Draw a five-pointed star.'};}
