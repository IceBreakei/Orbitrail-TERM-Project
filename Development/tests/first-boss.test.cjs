const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');let seconds=0,spawned=0,enabled=true;const enemies=[],listeners=[];
const c=vm.createContext({bossSpriteSize:268.8,document:{querySelector:()=>({textContent:''})},getAllEnemies:()=>enemies,isBossEnemy:e=>e.boss,
 onEnemySpawn:f=>{listeners.push(f);return()=>{}},onEnemyDefeat:()=>()=>{},offscreenSpawnPoint:()=>({x:-200,y:100})});
for(const n of ['game-config','boss-spawner'])vm.runInContext(fs.readFileSync('Development/'+n+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
c.getSeconds=()=>seconds;c.isEnabled=()=>enabled;c.spawnBoss=(type)=>{spawned++;const e={type,boss:true};enemies.push(e);listeners.forEach(f=>f(e));return true};
vm.runInContext("var spawner=createBossSpawner({canvas:{width:1280,height:720},camera:{x:0,y:0},getStage:()=>({id:'first'}),spawnBoss,slotsRemaining:()=>1,onSpawn:()=>{},isEndless:()=>false,getSurvivalSeconds:getSeconds,automaticEnabled:isEnabled})",c);
seconds=299.99;vm.runInContext('spawner.update(.1)',c);assert.equal(spawned,0);
seconds=300;vm.runInContext("spawner.update(.1)",c);assert.equal(spawned,0);
vm.runInContext("eventTriggerSettings.enabled=true",c);
seconds=300;enabled=false;vm.runInContext('spawner.update(.1)',c);assert.equal(spawned,0);
enabled=true;vm.runInContext('spawner.update(.1)',c);assert.equal(spawned,1);assert.equal(enemies[0].type,'shiroko');
enemies.length=0;seconds=400;vm.runInContext('spawner.update(2)',c);assert.equal(spawned,1);
console.log('PASS: first boss waits until300s, respects automatic toggle and spawns Shiroko only once.');

vm.runInContext('eventTriggerSettings.enabled=false;var manualSpawner=createBossSpawner({canvas:{width:1280,height:720},camera:{x:0,y:0},getStage:()=>({id:"first"}),spawnBoss,slotsRemaining:()=>1,onSpawn:()=>{},isEndless:()=>false})',c);
assert.equal(vm.runInContext('manualSpawner.requestWave()',c),true);
vm.runInContext('manualSpawner.update(.1)',c);assert.equal(spawned,2);
console.log('PASS: automatic triggers disabled by default, explicit admin boss wave remains available.');
