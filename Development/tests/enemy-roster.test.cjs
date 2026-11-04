const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const n of ['game-config','combat-hitboxes','sweeper-sprites','enemy-roster','enemy-variants'])vm.runInContext(fs.readFileSync('Development/'+n+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);const roster=run('createAdditionalEnemyRoster()');
assert.equal(Object.keys(roster).length,9);
for(const template of Object.values(roster)) {
 assert(fs.existsSync(path.resolve('Development',template.source.split('?')[0])));
 assert.equal(template.frameSequence.length,5);assert.equal(Object.keys(template.rows).length,8);
 assert.equal(template.layout.columnEdges.at(-1),992);assert.equal(template.layout.rowEdges[0].at(-1),template.label.startsWith('Arius')?1585:1586);
}
for(const [stage,count] of [['first',3],['second',3],['third',3],['fourth',3]]) {
 c.stage=stage;assert.equal(run('enemyStagePools[stage].length'),count);
 const selected=new Set();for(let i=0;i<100;i++)selected.add(run(`chooseStandardEnemy(()=>${i/100},200,stage)`));
 for(const id of selected)assert(run('enemyStagePools[stage]').includes(id));
}
assert.equal(run("chooseStandardEnemy(()=>.1,0,'third')"),'arius1');
assert.equal(run("chooseStandardEnemy(()=>.9,0,'fourth')"),'highlander3');
assert.equal(run('eventTriggerSettings.enabled'),false);
assert(!fs.readFileSync('Development/movement.js','utf8').includes('enemies/elite/'));
console.log('PASS:9new templates/assets/layouts,3variants perstage,stage-only selection and disabledautomatic events.');

assert.equal(vm.runInContext("createAdditionalEnemyRoster().arius1.layout.rowEdges[0].at(-1)",c),1585);

// Arius 2 uses frame-specific anchors instead of drifting with the sheet artwork.
assert(roster.arius2.layout.frames[1][0].y>roster.arius2.layout.rowEdges[0][1]);
for(let row=0;row<8;row++) for(let frame=0;frame<5;frame++) {
 const crop=roster.arius2.layout.frames[row][frame];
 assert(Number.isFinite(crop.anchorX));assert(crop.width>0&&crop.height>0);
 assert(crop.y+crop.height<=roster.arius2.layout.rowEdges[frame][row+1]);
}
assert(fs.readFileSync('Development/animation-lineup.js','utf8').includes('template.spriteSize || normalSpriteSize'));

// Alignment metadata covers every frame/direction and remains shared by Mega cloning.
for(const template of [roster.arius1,roster.highlander2,roster.opsSweeper,run("createSweeper('Heavy','../sprites/enemies/normal/HeavySweeper.png')")]) {
 assert.equal(template.layout.anchorX.length,8);
 for(const row of template.layout.anchorX) {assert.equal(row.length,5);assert(row.every(Number.isFinite));}
}
