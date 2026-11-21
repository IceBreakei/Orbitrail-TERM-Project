const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});for(const file of ['game-config','item-catalog','combat-stats'])vm.runInContext(fs.readFileSync(`Development/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var p={maxHp:playerSettings.planaHp,baseATK:playerSettings.planaBaseATK,baseSPD:playerSettings.planaBaseSPD,baseCritPercent:playerSettings.planaCritPercent}');
assert.equal(run('p.maxHp'),70);assert.equal(run('totalCharacterATK(p)'),130);assert.equal(run("statMultiplier(p,'spdPercent')"),1.3);assert.equal(run('ensureCombatStats(p).critPercent'),10);assert.equal(run('playerSettings.planaSize'),.2);
run('p.combatStats.atkPercent=20;p.combatStats.spdPercent=20');assert.equal(run('totalCharacterATK(p)'),150);assert.equal(run("statMultiplier(p,'spdPercent')"),1.5);assert.equal(run("statMultiplier({},'spdPercent')"),1);
for(const name of ['movement','movement-optimized']){const s=fs.readFileSync(`Development/${name}.js`,'utf8');assert(s.includes('baseATK: playerSettings.planaBaseATK'));assert(s.includes('sizeStat: playerSettings.planaSize'));assert(s.includes('characterSkills: []'));}
console.log('PASS Plana HP/ATK/SPD/CRT, additive bonuses, flat SIZE metadata and both previews.');

// The old 240 px/s already represented Plana's 1.3x base SPD.
run('p.combatStats.spdPercent=0;var planaTravelBase=playerSettings.speed/(playerSettings.planaBaseSPD/100)');
assert.equal(run("planaTravelBase*statMultiplier(p,'spdPercent')"),240);
run('p.combatStats.spdPercent=20');
assert(Math.abs(run("planaTravelBase*statMultiplier(p,'spdPercent')")-240*1.5/1.3)<1e-10);
for(const name of ['movement','movement-optimized'])assert(fs.readFileSync(`Development/${name}.js`,'utf8').includes('movementSpeedMultiplier: playerSettings.speed / (playerSettings.planaBaseSPD / 100) / movementSpeed'));
console.log('PASS original 240 px/s preserved at base 1.3x SPD; bonuses apply from normalized movement base.');

run('p.combatStats={}');assert.equal(run('ensureCombatStats(p).critPercent'),10);
run('p.combatStats.critPercent=25');assert.equal(run('ensureCombatStats(p).critPercent'),25);
assert(fs.readFileSync('Development/player-stats.js','utf8').includes('character.combatStats = {};'));
console.log('PASS character CRT defaults survive stat reset without overwriting explicit admin edits.');
