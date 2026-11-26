import { createBitmapText } from './bitmap-font.js';
/** Achievement hub landing; the three destination screens await their own definitions. */
export function createAchievementsMenu({panel,onBack}){
 const buttons=[...panel.querySelectorAll('[data-achievement-action]')];let selected=0;
 for(const node of panel.querySelectorAll('[data-achievement-text]')){const value=node.textContent,canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');node.replaceChildren(canvas);createBitmapText(canvas,{variant:'font2',scale:1.6,wrap:false}).setText(value);}
 function select(index){selected=index;buttons.forEach((button,i)=>button.classList.toggle('selected',i===index));}
 function close(){panel.hidden=true;onBack();}
 buttons.forEach((button,i)=>{button.addEventListener('pointerenter',()=>select(i));button.addEventListener('focus',()=>select(i));button.addEventListener('click',()=>{select(i);if(button.dataset.achievementAction==='quit')close();});});
 panel.addEventListener('contextmenu',event=>{if(panel.hidden)return;event.preventDefault();event.stopImmediatePropagation();close();});
 return {get active(){return !panel.hidden;},open(){panel.hidden=false;select(0);buttons[0].focus();},close,handleKey(event){if(['Escape','Shift'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();close();return;}if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();select((selected+(event.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length);buttons[selected].focus();}else if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopImmediatePropagation();buttons[selected].click();}}};
}
