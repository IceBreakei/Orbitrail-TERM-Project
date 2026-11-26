import {createBitmapText} from './bitmap-font.js';

/** Account-owned UI settings use stable 0/1 flag IDs, alongside content flags. */
export function initializeAccountSettings(save){
 const definitions=[['setting:shift-back','Shift to go back'],['setting:pause-on-tab-leave','Pause when leaving tab']];
 const controls=[];
 for(const panel of document.querySelectorAll('.title-settings, #pause-settings')){
  const group=document.createElement('div');group.className='account-setting-toggles';
  for(const [id,label]of definitions){
   const row=document.createElement('label'),input=document.createElement('input'),text=document.createElement('canvas');
   input.type='checkbox';input.setAttribute('aria-label',label);input.dataset.setting=id;
   createBitmapText(text,{variant:'font2',scale:1,wrap:true,maxWidth:250}).setText(label);
   row.append(input,text);group.append(row);controls.push({id,input});
   input.addEventListener('change',()=>save.set('flags',id,input.checked?1:0));
  }
  panel.append(group);
 }
 function sync(data){for(const {id,input}of controls)input.checked=data.flags[id]!==0;}
 sync(save.snapshot);save.subscribe(sync);
 // Registered before menu key handlers so Shift can be disabled consistently.
 window.addEventListener('keydown',event=>{
  if(event.key==='Shift'&&save.snapshot.flags['setting:shift-back']===0){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&save.snapshot.flags['setting:pause-on-tab-leave']!==0)document.querySelector('#pause-game')?.click();
 });
}
