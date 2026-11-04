const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});
for(const name of ['game-config','skill-drawing','skill-accuracy','admin-skills','skill-cast-state']) {
 const source=fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 vm.runInContext(source,c);
}
const run=code=>vm.runInContext(code,c);
for(let digit=1;digit<=6;digit++) {
 assert.equal(run(`recognizeAdminDigit(adminDigitTemplates[${digit}])`),digit);
 assert.equal(run(`recognizeAdminDigit(adminDigitTemplates[${digit}].map(stroke=>stroke.map(p=>({x:p.x*.3+100,y:p.y*.5+200}))))`),digit);
}
assert.equal(run('recognizeAdminDigit([[{x:10,y:5},{x:10,y:100}]])'),1);
assert.equal(run('recognizeAdminDigit([])'),null);
run("var owner={attackSlots:[{id:'plana-umbrella',icon:'umbrella',skillCooldownRemaining:180}]};var cast=createSkillCastState();");
assert.equal(run('cast.begin(owner,owner.attackSlots[0])'),false);
assert.equal(run('cast.begin(owner,owner.attackSlots[0],true)'),true);
run('cast.strokeStart();cast.addInk(5);cast.update(5)');
assert.equal(run('cast.resolve(cast.token,adminSkillResult(owner,0))'),true);
assert.equal(run('owner.attackSlots[0].skillCooldownRemaining'),180);
assert.equal(run('adminSkillResult(owner,5).valid'),false);
console.log('PASS: drawn1-6, scaled digits, straight1, cooldown bypass and undefined-slot rejection.');

run('owner.attackSlots.push({id:"luminous-nova",icon:"kei",exSkill:true})');
assert.equal(run('adminSkillResult(owner,1).skillId'),'luminous-nova-aura');
