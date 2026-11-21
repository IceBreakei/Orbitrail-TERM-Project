const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({getEnemyHurtbox:e=>({x:e.x,y:e.y,rx:20,ry:40}),stunnedFrames:[],loadGifAnimation:a=>{a.animationFrames=[{image:{naturalWidth:307,naturalHeight:159,frame:0},duration:50},{image:{naturalWidth:307,naturalHeight:159,frame:1},duration:50}];return Promise.resolve()},gifFrameAt:(frames,ms)=>Math.floor(ms/50)%2,Image:class{naturalWidth=307;naturalHeight=159;set src(v){this.onload?.()}}});
vm.runInContext(fs.readFileSync('Development/stunned-status.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var enemies=[{x:100,y:150,hp:10},{x:2000,y:150,hp:10},{x:100,y:150,hp:0}];');assert.equal(run('stunVisibleEnemies(enemies,{x:0,y:0},1280,720)'),1);assert.equal(run('enemies[0].stunRemaining'),3);assert.equal(run('enemies[1].stunRemaining'),undefined);
const draws=[];c.context={save(){},restore(){},drawImage(...args){draws.push(args)}};run('drawStunnedStatus(context,{x:0,y:0},enemies[0])');assert.equal(draws.length,1);assert.equal(draws[0][1]+draws[0][3]/2,100);assert.equal(draws[0][2]+draws[0][4],136);assert.equal(draws[0][3]/draws[0][4],307/159);
run('enemies[0].stunRemaining=0;drawStunnedStatus(context,{x:0,y:0},enemies[0])');assert.equal(draws.length,1);
let click;const status={};c.root={querySelector:s=>s==='[role="status"]'?status:{addEventListener:(name,fn)=>click=fn}};run('createStunnedAdmin({root,getEnemies:()=>enemies,getCamera:()=>({x:0,y:0}),getSize:()=>({width:1280,height:720})})');click();assert.match(status.textContent,/Stunned 1/);
assert(fs.existsSync('sprites/icons/effects/stunned.gif'));
console.log('PASS: onscreen-only3s stun,head-centered proportional stars,expiry hiding and admin button.');

run('enemies[0].stunVisualElapsed=.05;drawStunnedStatus(context,{x:0,y:0},enemies[0])');assert.equal(draws.at(-1)[0].frame,1);
console.log('PASS: stun stars use elapsed gameplay time to select decoded GIF frames.');
