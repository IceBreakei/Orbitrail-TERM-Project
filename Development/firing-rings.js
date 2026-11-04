/** Common growth keeps the outer rings strictly larger despite their staggered appearances. */
export function firingRingPoses(elapsed,size) {
  const growth=1+Math.min(1,Math.max(0,elapsed)/.5)*1.5;
  return Array.from({length:3},(_,i)=>{
    const age=elapsed-i*.045,t=age/.42;
    return {visible:age>=0&&t<1,x:i*22+Math.max(0,elapsed)*55,
      radius:size*(.65+i*.5)*growth,opacity:Math.max(0,1-t)**2*.75};
  });
}

/** Soft double-stroked muzzle shock rings; local impact only, no screen flash. */
export function drawFiringRings(context,x,y,angle,elapsed,size,blue=false) {
  const rings=firingRingPoses(elapsed,size);if(!rings.some(r=>r.visible))return;
  context.save();context.translate(x,y);context.rotate(angle);context.globalCompositeOperation='lighter';context.shadowBlur=0;
  for(const ring of rings) {
    if(!ring.visible)continue;context.globalAlpha=ring.opacity;context.beginPath();
    for(let point=0;point<=32;point++) {
      const a=point/32*Math.PI*2,px=ring.x+Math.cos(a)*ring.radius*.3,py=Math.sin(a)*ring.radius;
      if(point===0)context.moveTo(px,py);else context.lineTo(px,py);
    }
    context.strokeStyle=blue?'rgba(75,190,255,.4)':'rgba(255,100,220,.4)';context.lineWidth=6;context.stroke();
    context.strokeStyle=blue?'#e5fcff':'#ffe9fc';context.lineWidth=1.6;context.stroke();
  }
  context.restore();
}
