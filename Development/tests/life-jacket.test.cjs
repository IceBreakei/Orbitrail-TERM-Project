const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const numbers=[];const c=vm.createContext({showDamageNumber:(...a)=>numbers.push(a),rollLevelUpgrades:()=>[]});
for(const name of ['game-config','item-catalog','tuning-parts','combat-stats','player-stats','life-jacket','gacha-file-rules'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={maxHp:70,hp:50,shield:0,equipmentSlots:[]};ensurePlayerStats(p)');assert(run("applyItemUpgrade(p,'jacket-new')"));run('ensurePlayerStats(p)');assert.equal(run('totalPlayerShield(p)'),15);
for(const [level,capacity] of [[1,15],[2,20],[3,25],[4,30],[5,35]]){run(`p.equipmentSlots[0].level=${level};ensurePlayerStats(p)`);assert.equal(run('lifeJacketStats(p).capacity'),capacity);assert.equal(run('p.lifeJacketState.remaining'),capacity);}
assert.equal(run('p.equipmentSlots[0].weight'),3);
run('p.equipmentSlots[0].level=1;ensurePlayerStats(p);delete p.damageFlashElapsed');assert(run('damagePlayer(p,10)'));assert.equal(run('p.hp'),50);assert.equal(run('p.lifeJacketState.remaining'),6);assert.equal(numbers.at(-1)[3],'shield');assert.equal(numbers.at(-1)[1],9);assert.equal(run('p.lastDamageResult.healthDamage'),0);assert.equal(run('p.lastDamageResult.shieldDamage'),9);assert.equal(run('p.damageFlashElapsed'),undefined);
run('updateLifeJacket(p,14.99)');assert.equal(run('p.lifeJacketState.remaining'),6);run('updateLifeJacket(p,.01)');assert.equal(run('p.lifeJacketState.remaining'),15);
run('p.damageReductionPercent=[20];p.lifeJacketState.remaining=0;damagePlayer(p,100)');assert.equal(run('p.lastDamageResult.healthDamage'),50);assert.equal(run('p.hp'),0); // round100*.8*.9=72, limited by50HP.
run('p.hp=70;p.lifeJacketState.remaining=0;damagePlayer(p,50)');assert.equal(run('p.hp'),34,'DR stacks multiplicatively:50*.8*.9=36');
// Item shield is independent of administrative shields and can exceed very low max HP.
run('p.hp=70;p.shield=10;p.damageReductionPercent=[];p.lifeJacketState.remaining=15;damagePlayer(p,30)');assert.equal(run('p.lifeJacketState.remaining'),0);assert.equal(run('p.shield'),0);assert.equal(run('p.hp'),68);
run('p.equipmentSlots=[createLifeJacket(true)];ensurePlayerStats(p);p.hp=30;updateLifeJacket(p,2.99)');assert.equal(run('p.hp'),30);run('updateLifeJacket(p,.01)');assert.equal(run('p.hp'),40);run('updateLifeJacket(p,3)');assert.equal(run('p.hp'),50);
run('damagePlayer(p,10);updateLifeJacket(p,8)');assert.equal(run('p.hp'),50,'Damaged shield prevents full-shield healing');run('updateLifeJacket(p,1)');assert.equal(run('p.lifeJacketState.remaining'),40);run('updateLifeJacket(p,3)');assert.equal(run('p.hp'),60);
run('p.maxHp=1;p.hp=1;ensurePlayerStats(p)');assert.equal(run('p.lifeJacketState.remaining'),40,'Jacket capacity is not capped by max HP');
run('p.equipmentSlots=[];ensurePlayerStats(p)');assert.equal(run('p.lifeJacketState'),undefined);
run('p.maxHp=70;p.hp=50;p.equipmentSlots=[createLifeJacket()];ensurePlayerStats(p);var product=rollFileRewards(p,{forceType:"super",superItems:[createLifeJacket(true)],random:()=>0}).products[0]');assert(run('acceptFileProduct(p,product)'));run('ensurePlayerStats(p)');assert.equal(run('p.lifeJacketState.remaining'),40);assert.equal(run('p.equipmentSlots.length'),1);
run('setPlayerDamageGuard(()=>true)');assert.equal(run('damagePlayer(p,100)'),false);assert.equal(run('p.lifeJacketState.remaining'),40,'Hit negation preserves jacket shield');assert.equal(numbers.at(-1)[3],'miss');
assert(fs.existsSync('sprites/items/Life Jacket.png'));
console.log('PASS Life Jacket capacities, shield/HP distinction,15s refresh,multiplicative DR,Super3s full-shield heals,reset after damage,low-HP capacity,Super File replacement and negation.');

run('setPlayerDamageGuard(null);p.equipmentSlots=[createLifeJacket()];ensurePlayerStats(p);p.hp=70;p.shield=0;p.lifeJacketState.remaining=5');
numbers.length=0;run('damagePlayer(p,20)');assert.equal(numbers.length,2);assert.equal(numbers[0][1],5);assert.equal(numbers[0][3],'shield');assert.equal(numbers[1][1],13);assert.equal(numbers[1][3],undefined);
console.log('PASS shield/HP overflow creates separate blue-shield and red-HP popup requests.');
