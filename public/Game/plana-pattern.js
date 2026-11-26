import { drawingBounds, normalizeSkillStrokes } from './skill-drawing.js';
import { planaSkillSettings } from './game-config.js';

const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);

/** Reduce pen jitter while preserving corners and line crossings. */
function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  const a=points[0], b=points.at(-1), dx=b.x-a.x, dy=b.y-a.y, length=dx*dx+dy*dy;
  let maximum=0,index=0;
  for(let i=1;i<points.length-1;i++) {
    const t=length?Math.max(0,Math.min(1,((points[i].x-a.x)*dx+(points[i].y-a.y)*dy)/length)):0;
    const d=Math.hypot(points[i].x-a.x-t*dx,points[i].y-a.y-t*dy);
    if(d>maximum){maximum=d;index=i;}
  }
  return maximum>tolerance
    ? [...simplify(points.slice(0,index+1),tolerance).slice(0,-1),...simplify(points.slice(index),tolerance)] : [a,b];
}

/** Clip into continuous sub-strokes; never join separate shape pieces across excluded ink. */
function splitStrokes(strokes, include) {
  const result=[];
  for(const stroke of strokes){let part=[];for(const p of stroke){
    if(include(p))part.push(p);else{if(part.length>1)result.push(part);part=[];}
  }if(part.length>1)result.push(part);}
  return result;
}

/** Find a proper interior crossing, distinguishing an X from a V or parallel lines. */
function crossing(a,b) {
  const ax=a.b.x-a.a.x,ay=a.b.y-a.a.y,bx=b.b.x-b.a.x,by=b.b.y-b.a.y;
  const determinant=ax*by-ay*bx;
  if(Math.abs(determinant)<1e-6)return null;
  const dx=b.a.x-a.a.x,dy=b.a.y-a.a.y;
  const t=(dx*by-dy*bx)/determinant,u=(dx*ay-dy*ax)/determinant;
  return t>.15&&t<.85&&u>.15&&u<.85?{x:a.a.x+t*ax,y:a.a.y+t*ay}:null;
}

/** Split and validate the ring, lower X and upper arrow, independent of stroke order. */
export function segmentPlanaPattern(strokes) {
  strokes = normalizeSkillStrokes(strokes);
  const bounds=drawingBounds(strokes),s=planaSkillSettings;
  const fail=reason=>({valid:false,reason,parts:[]});
  if(!bounds)return fail('Draw a circle with an arrow above an X inside it.');
  const width=bounds.right-bounds.left,height=bounds.bottom-bounds.top;
  const diameter=Math.max(width,height),cx=(bounds.left+bounds.right)/2,cy=(bounds.top+bounds.bottom)/2;
  const radial=p=>Math.hypot((p.x-cx)/(width/2),(p.y-cy)/(height/2));
  // Prefer actual curved ring strokes, so symbols drawn close to the circumference
  // retain their tips instead of being incorrectly absorbed into the circle crop.
  const circular = new Set(strokes.filter(stroke => {
    if (stroke.length < 6) return false;
    let length=0,error=0;
    for(let i=0;i<stroke.length;i++){error+=Math.abs(radial(stroke[i])-1);if(i)length+=distance(stroke[i],stroke[i-1]);}
    return length>diameter*.5 && length/Math.max(1,distance(stroke[0],stroke.at(-1)))>1.12 &&
      error/stroke.length<s.circleRadialTolerance;
  }));
  const circle=splitStrokes(circular.size?[...circular]:strokes,p=>radial(p)>=s.ringInnerRadius);
  const ring=circle.flat(),bins=new Set();let radialError=0,ringLength=0;
  for(const p of ring){bins.add((Math.floor((Math.atan2(p.y-cy,p.x-cx)+Math.PI)*8/(Math.PI*2))+8)%8);radialError+=Math.abs(radial(p)-1);}
  for(const part of circle)for(let i=1;i<part.length;i++)ringLength+=distance(part[i],part[i-1]);
  if(bins.size<7||!ring.length||radialError/ring.length>s.circleRadialTolerance||ringLength<diameter*1.9)return fail('Complete the outer circle around both symbols.');
  const inner=circular.size
    ? [...splitStrokes(strokes.filter(stroke=>!circular.has(stroke)),p=>radial(p)<1.05),
       ...splitStrokes([...circular],p=>radial(p)<s.ringInnerRadius)]
    : splitStrokes(strokes,p=>radial(p)<s.ringInnerRadius);
  const lines=[];
  for(const part of inner){const points=simplify(part,diameter*s.lineSimplifyRatio);
    for(let i=1;i<points.length;i++)if(distance(points[i-1],points[i])>diameter*.07)lines.push({a:points[i-1],b:points[i]});}
  const diagonal=line=>Math.abs(line.b.x-line.a.x)>diameter*.08&&Math.abs(line.b.y-line.a.y)>diameter*.08;
  const crosses=[];
  for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
    const a=lines[i],b=lines[j],point=crossing(a,b);
    if(point&&point.y>cy-height*.08&&diagonal(a)&&diagonal(b)&&
      (a.b.x-a.a.x)*(a.b.y-a.a.y)*(b.b.x-b.a.x)*(b.b.y-b.a.y)<0)crosses.push({point,lines:[a,b]});
  }
  const tolerance=diameter*s.joinToleranceRatio;
  for(const cross of crosses)for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
    const a=lines[i],b=lines[j];
    for(const tipA of [a.a,a.b])for(const tipB of [b.a,b.b]){
      if(distance(tipA,tipB)>tolerance)continue;
      const tip={x:(tipA.x+tipB.x)/2,y:(tipA.y+tipB.y)/2};
      const armA=tipA===a.a?a.b:a.a,armB=tipB===b.a?b.b:b.a;
      if(tip.y>=cross.point.y-height*.1)continue;
      const shaft=lines.find(line=>{
        if(line===a||line===b)return false;
        const near=distance(line.a,tip)<distance(line.b,tip)?line.a:line.b;
        const end=near===line.a?line.b:line.a;
        const dx=end.x-tip.x,dy=end.y-tip.y,length=Math.hypot(dx,dy);
        if(distance(near,tip)>tolerance||length<diameter*.14)return false;
        const ux=dx/length,uy=dy/length;
        const av={x:armA.x-tip.x,y:armA.y-tip.y},bv={x:armB.x-tip.x,y:armB.y-tip.y};
        const sideA=ux*av.y-uy*av.x,sideB=ux*bv.y-uy*bv.x;
        return av.x*ux+av.y*uy>diameter*.035&&bv.x*ux+bv.y*uy>diameter*.035&&
          sideA*sideB<0&&Math.min(Math.abs(sideA),Math.abs(sideB))>diameter*.035;
      });
      if(!shaft)continue;
      const arrow=[a,b,shaft];
      if(Math.max(...arrow.flatMap(line=>[line.a.y,line.b.y]))>=cross.point.y)continue;
      return {valid:true,score:Math.max(.7,1-radialError/ring.length),parts:[
        {name:'circle',strokes:circle},{name:'x',strokes:cross.lines.map(line=>[line.a,line.b])},
        {name:'arrow',strokes:arrow.map(line=>[line.a,line.b])}]};
    }
  }
  return fail(crosses.length?'Draw an arrow above the X, inside the circle.':'Draw two crossing diagonal lines for the X below the arrow.');
}
