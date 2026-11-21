const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const voices=[];
class AudioMock{constructor(source){this.source=source;this.listeners={};voices.push(this)}addEventListener(name,fn){this.listeners[name]=fn}play(){this.played=true;return Promise.resolve()}pause(){throw Error('Cut off a doot')}}
const c=vm.createContext({Audio:AudioMock,AudioContext:class{state="running";destination={};createMediaElementSource(voice){return {connect(gain){voice.boost=gain.gain},disconnect(){}}}createGain(){return {gain:{value:1},connect(){},disconnect(){}}}}});for(const name of ['tuning-parts','trumpet-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",tuningParts:createTuningRun()};');
for(const [level,frames,volume] of [[1,8,3.125],[2,6,6.25],[3,4,9.375]]){
 run(`p.tuningParts.equipped[0]={id:"trumpet-tuning",level:${level}};updateTrumpetTuning(1)`);assert(run('playTrumpetTuning(p)'));assert.equal(voices.at(-1).loop,false);assert.equal(voices.at(-1).volume*(voices.at(-1).boost?.value||1),volume);assert.equal(run('playTrumpetTuning(p)'),false);run(`updateTrumpetTuning(${frames}/60)`);assert(run('playTrumpetTuning(p)'));
}
assert.equal(voices.length,6);assert.equal(run('trumpetVoiceCount()'),6);voices[0].listeners.ended();assert.equal(run('trumpetVoiceCount()'),5);assert(voices.every(v=>v.played));assert.equal(run('playTrumpetTuning(p,"aris-laser")'),false);
assert(fs.existsSync('Audio/SFX/why.mp3'));assert(fs.existsSync('sprites/icons/mikalol.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="trumpet-tuning").weight'),2);
console.log('PASS:8/6/4frame cooldown,increasing volume,independent overlapping nonloop voices,natural cleanup,starting weapon scope and assets.');

run('setTrumpetVolume(.5)');assert.equal(voices.at(-1).volume*(voices.at(-1).boost?.value||1),4.6875);run('updateTrumpetTuning(1);playTrumpetTuning(p)');assert.equal(voices.at(-1).volume*(voices.at(-1).boost?.value||1),4.6875);
run('setTrumpetVolume(0)');assert.equal(voices.at(-1).volume,0);assert(voices.at(-1).played);
const slider={value:'40',addEventListener(name,fn){this.input=fn}};c.slider=slider;run('bindTrumpetVolume(slider)');assert.equal(voices.at(-1).volume*(voices.at(-1).boost?.value||1),9.375*.4);slider.value='80';slider.input();assert.equal(voices.at(-1).volume*(voices.at(-1).boost?.value||1),9.375*.8);
console.log('PASS: volume slider scales new and overlapping doots live,including mute,without cutting/restarting playback.');

run('setTrumpetVolume(.4);p.tuningParts.equipped[0].level=1;updateTrumpetTuning(1);playTrumpetTuning(p)');assert.equal(voices.at(-1).volume*(voices.at(-1).boost?.value||1),1.25);
console.log('PASS: LV1effectivegain3.125 (5x2.5xoriginal0.25),scaledbyslider.');

assert.equal(run('tuningPartCatalog.find(p=>p.id==="trumpet-tuning").levels[1].dootVolume'),run('trumpetBaseGain*2'));
assert.equal(run('tuningPartCatalog.find(p=>p.id==="trumpet-tuning").levels[2].dootVolume'),run('trumpetBaseGain*3'));
console.log('PASS: LV2/LV3 gains derive from the shared LV1 variable at2x/3x.');
