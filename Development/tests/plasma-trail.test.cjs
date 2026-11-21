const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({});for(const name of ['game-config','luminous-nova'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var bullet={x:0,y:0,age:.2,angle:0,color:"blue",speed:900};bullet.x=10;rememberPlasmaTrail(bullet,{x:0,y:0},200);bullet.y=10;bullet.angle=Math.PI/2;rememberPlasmaTrail(bullet,{x:10,y:0},200);');
const path=run('plasmaTrailPoints(bullet,200)');assert.equal(path.length,3);assert(Math.abs(path.at(-1).distance-20)<1e-8);
// A turning projectile must end its wake at a traveled point, not extrapolate a long tangent.
assert(Math.abs(path.at(-1).x+10)<1e-8);assert(Math.abs(path.at(-1).y-10)<1e-8);
const limited=run('plasmaTrailPoints(bullet,5)');assert.equal(limited.at(-1).distance,5);assert.equal(run('plasmaTrailPoints(bullet,0)'),null);
const gradients=[],colors=[];let beziers=0,vertices=0;
c.ctx={save(){},restore(){},translate(){},rotate(){},createRadialGradient(){return {addColorStop:(n,color)=>colors.push(color)}},createLinearGradient(...args){gradients.push(args);return {addColorStop:(n,color)=>colors.push(color)}},beginPath(){},arc(){},fill(){},moveTo(){vertices++},lineTo(){vertices++},bezierCurveTo(){beziers++}};
run('drawLuminousPlasma(ctx,{x:0,y:0},bullet,12,1)');assert.equal(beziers,0);assert(vertices>0);assert(Math.hypot(...gradients[0].slice(0,2))<21,'No200px tangent spike from20px traveled path');assert(colors.includes('rgba(125,229,255,.75)'));
gradients.length=0;beziers=0;colors.length=0;
run('drawLuminousPlasma(ctx,{x:0,y:0},{x:0,y:0,age:.2,angle:0,color:"blue",speed:900},12,1)');assert.equal(beziers,8);assert.equal(gradients[0][0],-180);assert.equal(gradients[0][1],0);assert(colors.includes('rgba(125,229,255,.75)'));
// Histories stay bounded for long-lived or very high-FPS callers.
run('for(let i=0;i<1000;i++){const from={x:bullet.x,y:bullet.y};bullet.x+=.5;rememberPlasmaTrail(bullet,from,200)}');assert(run('bullet.trail.length')<=48);
console.log('PASS curved plasma follows actual traveled positions, retains shared gradients/bloom, preserves ordinary straight trails and bounds history.');
