import { createBitmapText } from './bitmap-font.js';
export function createCreditsMenu({panel,onBack}){
 for(const node of panel.querySelectorAll('[data-credits-text]')){const value=node.textContent,c=document.createElement('canvas');node.replaceChildren(c);createBitmapText(c,{variant:'font2',scale:1.4,wrap:false}).setText(value);}
 function close(){panel.hidden=true;onBack();}
 panel.querySelector('[data-credits-quit]').addEventListener('click',close);panel.addEventListener('contextmenu',event=>{if(panel.hidden)return;event.preventDefault();event.stopImmediatePropagation();close();});
 return {get active(){return !panel.hidden;},open(){panel.hidden=false;panel.querySelector('.credits-content').scrollTop=0;panel.querySelector('[data-credits-quit]').focus();},close,handleKey(event){if(['Escape','Shift'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();close();}}};
}
