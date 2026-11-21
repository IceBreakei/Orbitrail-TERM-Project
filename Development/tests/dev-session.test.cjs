const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('Development/dev-session.js','utf8');
const store=new Map();
function page(){
 const input={id:'disable-autoattack',type:'checkbox',value:'on',checked:false,dispatchEvent(){this.applied=true}};
 const document={querySelectorAll(s){return s.startsWith('.test-toolbar')?[input]:[]},querySelector(){return null},addEventListener(){}};
 class Socket{constructor(){this.listeners=[]}addEventListener(type,fn){this.listeners.push(fn)}sendReload(data='reload'){this.listeners.forEach(fn=>fn({data}))}}
 const c={location:{pathname:'/Development/movement.html'},Date,Event,document,sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},WebSocket:Socket};c.window=c;vm.runInNewContext(source,c);return {c,input};
}
let a=page();a.input.checked=true;new a.c.WebSocket().sendReload();
let b=page();b.c.restoreDevSession();assert.equal(b.input.checked,true);assert(b.input.applied);
let manual=page();manual.c.restoreDevSession();assert.equal(manual.input.checked,false);assert.equal(store.size,0);
a=page();a.input.checked=true;new a.c.WebSocket().sendReload(JSON.stringify({type:'full-reload'}));b=page();b.c.restoreDevSession();assert(b.input.checked);
store.set('orbitrail:dev-settings:/Development/movement.html:code-reload',JSON.stringify(Date.now()-20000));manual=page();manual.c.restoreDevSession();assert.equal(manual.input.checked,false);
console.log('PASS: Live Server/Vite reloads restore settings; manual refresh and stale signals reset.');
