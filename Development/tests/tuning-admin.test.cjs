const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const buttons={children:[],replaceChildren(){this.children=[]},append(n){this.children.push(n)}};
const level={value:'3'},status={};
const root={querySelector:s=>({'#admin-tuning-buttons':buttons,'#admin-tuning-level':level,'#admin-tuning-status':status}[s])};
let calls=[],allowed=true;
const c=vm.createContext({document:{createElement:()=>({addEventListener(event,fn){this.click=fn}})},root,getPlayer:()=>({x:100,y:200}),system:{spawn:(...args)=>{calls.push(args);return allowed;}}});
for(const name of ['tuning-parts','tuning-admin'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
vm.runInContext('createTuningAdmin({root,getPlayer,system})',c);
assert.equal(buttons.children.length,22);assert.equal(buttons.children[0].textContent,'Spawn Power Tuning');const button=buttons.children[0];button.click();assert.deepEqual(calls[0].slice(0,2),[180,200]);assert.equal(calls[0][2].level,3);assert.equal(calls[0][2].id,'power-tuning');assert.match(status.textContent,/spawned/);
level.value='99';button.click();assert.equal(calls.length,1);level.value='1';allowed=false;button.click();assert.match(status.textContent,/No safe ground/);
buttons.children.find(b=>b.textContent==='Spawn Cold Tuning').click();assert.equal(calls.at(-1)[2].id,'cold-tuning');
console.log('PASS: per-part spawn buttons, level3 manual spawn, invalid level guard and safe-placement failure feedback.');

allowed=true;level.value='3';buttons.children.find(b=>b.textContent==='Spawn Duel Trigger Tuning').click();assert.equal(calls.at(-1)[2].level,2);
console.log('PASS: Duel Trigger admin spawn clamps to its ownLV2 cap.');
