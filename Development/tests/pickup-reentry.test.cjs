const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({});vm.runInContext(fs.readFileSync('Development/pickup-reentry.js','utf8').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var guard=createPickupReentryGuard();var first={id:1},second={id:2};');
assert.equal(run('guard.blocked(first,true,10)'),false);
run('guard.block(first)');
assert.equal(run('guard.blocked(first,true,10)'),true);
assert.equal(run('guard.blocked(first,false,10)'),true); // leave-detection frame is never charged
assert.equal(run('guard.blocked(first,false,1.49)'),true);
assert.equal(run('guard.blocked(first,true,.01)'),true); // early reentry restarts protection
assert.equal(run('guard.blocked(first,false,10)'),true);
assert.equal(run('guard.blocked(first,false,0)'),true); // pause never advances cooldown
assert.equal(run('guard.blocked(first,false,-5)'),true);
assert.equal(run('guard.blocked(first,false,1.5)'),false);
assert.equal(run('guard.blocked(first,true,0)'),false);
// Finishing another drop must not overwrite an existing drop's protection.
run('guard.block(first);guard.block(second)');
assert.equal(run('guard.blocked(first,false,0)'),true);
assert.equal(run('guard.blocked(second,true,2)'),true);
assert.equal(run('guard.blocked(first,false,1.5)'),false);
assert.equal(run('guard.blocked(second,false,2)'),true);
assert.equal(run('guard.blocked(second,false,1.49)'),true);
run('guard.forget(second)');assert.equal(run('guard.blocked(second,true,0)'),false);
run('guard.block(first);guard.clear()');assert.equal(run('guard.blocked(first,true,0)'),false);
console.log('PASS per-drop reentry: leave required,1.5s continuous clearance, paused timer, recontact reset, independent drops and cleanup.');
