const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,{hidden:true,value:'0',textContent:'',children:[],listeners:{},style:{setProperty(k,v){this[k]=v}},
 getContext(){return {}},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.listeners[k]=v},focus(){},append(){},replaceChildren(){},
 querySelector(){return el('summary')},querySelectorAll(selector){return selector==='.pause-weapon-divider'?[el('divider')]:selector==='[data-thin-text]'?[el('#pause-skill-equipped'),el('#pause-skill-effect')]:[]}});return elements.get(id)}
const context=vm.createContext({document:{querySelector:el,createElement:()=>el('generated'),body:{classList:{contains:()=>false}}},
 window:{addEventListener(){}},Image:class{},URL,ResizeObserver:class{observe(){}},
 createBitmapText:()=>({setText(){},setMaxWidth(){}}),ensurePlayerStats:p=>p,planaSkillSettings:{stunSeconds:3}});
vm.runInContext(fs.readFileSync('Development/character-stats-panel.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
const source=fs.readFileSync('Development/pause-menu.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/pause-menu.js'");
vm.runInContext(source+";var menu=createPauseMenu({canvas:document.querySelector('canvas'),getPlayer:()=>({label:'Plana',hp:110,maxHp:110,combatStats:{},attackSlots:[]}),releaseControls(){}})",context);
const click=id=>el(id).listeners.click({currentTarget:el(id)});
const right=()=>el('#pause-menu').listeners.pointerdown({button:2,preventDefault(){},stopPropagation(){}});
click('#pause-game');assert(vm.runInContext('menu.paused',context));
click('#pause-skills-open');assert(!el('#pause-skills-panel').hidden);
right();assert(el('#pause-skills-panel').hidden);assert(vm.runInContext('menu.paused',context));
click('#pause-settings-toggle');assert(!el('#pause-settings').hidden);
right();assert(el('#pause-settings').hidden);assert(vm.runInContext('menu.paused',context));
right();assert(!vm.runInContext('menu.paused',context));
console.log('PASS: right-click backs out of EX/Settings and resumes only at pause root.');
