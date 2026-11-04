const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=file=>fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
const values=new Map(),elements=new Map(),navigations=[];
function element(id){if(!elements.has(id))elements.set(id,{value:'',hidden:true,disabled:false,returnValue:'',listeners:{},
 addEventListener(type,fn){this.listeners[type]=fn},setAttribute(){},removeAttribute(){},
 showModal(){this.open=true},querySelector(){return element('submit')}});return elements.get(id)}
const context=vm.createContext({sessionStorage:{getItem:key=>values.get(key),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},
 document:{querySelector:element},window:{location:{assign:url=>navigations.push(url),replace:url=>navigations.push(url)}},
 console,isAdmin:()=>true,getFirebaseAuth:async()=>({auth:{},sdk:{signInWithEmailAndPassword:async()=>{}}})});
vm.runInContext(source('guest-session.js')+source('script.js'),context);
const run=code=>vm.runInContext(code,context);
assert.equal(run('isGuestSession()'),false);
element('#continue-as-guest').listeners.click();assert(element('#guest-confirmation').open);
element('#guest-confirmation').returnValue='cancel';element('#guest-confirmation').listeners.close();
assert.equal(navigations.length,0);assert.equal(run('isGuestSession()'),false);
element('#guest-confirmation').returnValue='';element('#guest-confirmation').listeners.close();
assert.equal(navigations.length,0);
element('#guest-confirmation').returnValue='continue';element('#guest-confirmation').listeners.close();
assert.equal(run('isGuestSession()'),true);assert.equal(navigations.pop(),'project.html');
let firebaseCalls=0;
context.getFirebaseAuth=async()=>{firebaseCalls++;throw Error('must not be needed for guest')};
vm.runInContext(source('project.js'),context);
assert.equal(firebaseCalls,0);assert(element('#development-link').hidden);
vm.runInContext(source('Development/admin-guard.js'),context);
(async()=>{
 assert.equal(await run('requireAdmin()'),false);assert.equal(navigations.pop(),'../project.html');assert.equal(firebaseCalls,0);
 // Successful account login exits guest mode.
 context.getFirebaseAuth=async()=>({auth:{},sdk:{signInWithEmailAndPassword:async()=>{}}});
 await element('#auth-form').listeners.submit({preventDefault(){}});
 assert.equal(run('isGuestSession()'),false);assert.equal(navigations.pop(),'project.html');
 console.log('PASS: guest confirmation/cancel/Escape, guest workspace entry without Firebase, blocked admin access and successful account login clears guest mode.');
})().catch(error=>{console.error(error);process.exitCode=1});
