import { segmentPlanaPattern } from './plana-pattern.js';
import { drawingModelImage, drawingBounds, normalizeSkillStrokes } from './skill-drawing.js';
import { drawingAccuracy, skillDamageMultiplier } from './skill-accuracy.js';
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
  if(weapon?.id==='princess-key')return recognizePrincessKeyPattern(strokes,recognizer,isCurrent);
  if (weapon?.id === 'luminous-nova') return recognizeLuminousNovaPattern(strokes,recognizer,isCurrent);
  if (weapon?.id === 'aris-laser') return recognizeSupernovaPattern(strokes, recognizer, isCurrent);
  if (weapon?.id !== 'plana-umbrella') return { valid: false, reason: 'No drawing skill is defined for this weapon yet.' };
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
  let bestMatch = null, bestFailure = null;
  const validMatches = [];
  for (const weapon of skills) {
    if (weapon.skillCooldownRemaining > 0) continue;
    if (!isCurrent()) return { valid: false, cancelled: true };
    const result = await recognizeWeaponPattern(strokes, weapon, recognizer, isCurrent);
    const accuracy = weapon.id==='princess-key'?drawingAccuracy(strokes,princessKeyReferenceStrokes()):weapon.id === 'aris-laser' ? drawingAccuracy(strokes, supernovaReferenceStrokes()) :
      weapon.id === 'luminous-nova' ? drawingAccuracy(strokes,luminousNovaReferenceStrokes()) : weapon.id === 'plana-umbrella' ? drawingAccuracy(strokes) : 0;
    const candidate = {...result, weapon, matchAccuracy: result.matchAccuracy??accuracy};
    if (result.valid) validMatches.push(candidate);
    if (result.valid && (!bestMatch || candidate.matchAccuracy > bestMatch.matchAccuracy)) bestMatch = candidate;
    if (!bestFailure || accuracy > bestFailure.matchAccuracy) bestFailure = candidate;
  }
  if (!isCurrent()) return {valid:false,cancelled:true};
  validMatches.sort((a,b)=>b.matchAccuracy-a.matchAccuracy);
  if (validMatches.length > 1 && validMatches[0].matchAccuracy-validMatches[1].matchAccuracy < skillCastSettings.matchMinimumMargin) {
    return {valid:false,reason:'Drawing is ambiguous. Please try again.'};
  }
  return bestMatch || bestFailure || {valid:false,reason:'No ready skill matches this pattern.'};
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
  if (!drawingBounds(strokes)) return null;
  if(linkedFrameEvidence(strokes))return skills.find(w=>w.id==='princess-key'&&!(w.skillCooldownRemaining>0))||null;
  let best = null, score = .25, runnerUp = 0;
  for (const weapon of skills) {
    if (weapon.skillCooldownRemaining > 0) continue;
    const reference = weapon.id==='princess-key'?princessKeyReferenceStrokes():weapon.id === 'luminous-nova'?luminousNovaReferenceStrokes():weapon.id === 'aris-laser' ? supernovaReferenceStrokes() : undefined;
    if (!reference && weapon.id !== 'plana-umbrella') continue;
    const accuracy = drawingAccuracy(strokes, reference);
    if (accuracy > score) { runnerUp = score === .25 ? 0 : score; score = accuracy; best = weapon; }
    else runnerUp = Math.max(runnerUp,accuracy);
  }
  return score-runnerUp >= skillCastSettings.matchMinimumMargin ? best : null;
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
