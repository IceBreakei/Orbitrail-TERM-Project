/** Conservative broadphase only; callers retain their existing exact collision tests. */
export function createEnemySpatialIndex(enemies, getBounds, cellSize=128) {
  const cells=new Map();
  enemies.forEach((enemy,order)=>{
    const b=getBounds(enemy),entry={enemy,order};
    for(let y=Math.floor((b.y-b.ry)/cellSize);y<=Math.floor((b.y+b.ry)/cellSize);y++)
      for(let x=Math.floor((b.x-b.rx)/cellSize);x<=Math.floor((b.x+b.rx)/cellSize);x++) {
        const key=x+','+y;
        let bucket=cells.get(key);if(!bucket)cells.set(key,bucket=[]);
        bucket.push(entry);
      }
  });
  return {querySegment(from,to,padding=0) {
    const found=new Set();
    for(let y=Math.floor((Math.min(from.y,to.y)-padding)/cellSize);y<=Math.floor((Math.max(from.y,to.y)+padding)/cellSize);y++)
      for(let x=Math.floor((Math.min(from.x,to.x)-padding)/cellSize);x<=Math.floor((Math.max(from.x,to.x)+padding)/cellSize);x++)
        for(const entry of cells.get(x+','+y)||[])found.add(entry);
    // Preserve Map insertion order: piercing limits and random damage rolls depend on it.
    return [...found].sort((a,b)=>a.order-b.order).map(entry=>entry.enemy);
  }};
}
