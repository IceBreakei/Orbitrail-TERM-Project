const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const draws=[],glows=[],angles=[];
const c=vm.createContext({Image:class{decode(){return Promise.resolve()}}});
vm.runInContext(fs.readFileSync('Development/synergy-icon.js','utf8').replaceAll('export ',''),c);
const context={clearRect(){},save(){},restore(){},translate(){},rotate(angle){angles.push(angle)},drawImage(image){draws.push(image.src);glows.push(this.shadowColor)}};
c.canvas={width:128,height:128,getContext:()=>context};
(async()=>{
 for(const [top,name] of [['aris-laser','Arisu'],['luminous-nova','Kei']]) {
  draws.length=0;glows.length=0;angles.length=0;c.item={id:'princess-key',synergyTopWeaponId:top};
  vm.runInContext('drawSynergyIcon(canvas,item)',c);await new Promise(resolve=>setImmediate(resolve));
  assert(draws.at(-1).includes(name));assert(glows.includes('#65cfff'));assert(glows.includes('#ff71d5'));assert.equal(draws.length,6);assert.equal(angles.length,2);assert(angles.every(angle=>Math.sin(angle)<0),"Both native right-facing barrels point upward");
 }
 console.log('PASS: both colored glow passes render and first-MAX weapon is drawn last.');
})().catch(error=>{console.error(error);process.exitCode=1});
