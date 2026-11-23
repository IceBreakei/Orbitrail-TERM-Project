import { createArmoryMenu } from './armory-menu.js';
import { getLootTotals } from './exp-drops.js';
import { createUpgradeMenu } from './shop-upgrades-menu.js';
import { createBitmapText } from './bitmap-font.js';
/** Shop landing only; purchases and account currency are introduced with their own menus. */
export function createShopMenu({root,onBack,getPlayer=()=>({})}){
 const panel=root.querySelector('.title-shop');
 for(const node of panel.querySelectorAll('[data-shop-text]')){const graphic=document.createElement('canvas');graphic.width=500;graphic.height=48;graphic.setAttribute('aria-hidden','true');createBitmapText(graphic,{variant:'font2',scale:1.6,wrap:false,fitWidth:490}).setText(node.textContent);node.replaceChildren(graphic);}
 const creditNode=panel.querySelector('[data-shop-credits]');const creditCanvas=document.createElement('canvas');creditNode.append(creditCanvas);const creditText=createBitmapText(creditCanvas,{variant:'font2',scale:1.6,wrap:false});
 function updateCredits(){const amount=String(getLootTotals().credits);creditText.setText(amount);creditNode.setAttribute('aria-label',`${amount} Credits`);}
 const back=panel.querySelector('[data-shop-back]');
 const options=panel.querySelector('.shop-options');
 const upgrades=createUpgradeMenu({panel:panel.querySelector('.shop-upgrades'),onBalanceChange:updateCredits,onBack:()=>{options.hidden=false;panel.querySelector('[data-shop-upgrades]').focus();}});
 panel.querySelector('[data-shop-upgrades]').addEventListener('click',()=>{options.hidden=true;upgrades.open();});
 const armory=createArmoryMenu({getPlayer,panel:panel.querySelector('.shop-armory'),onBack:()=>{options.hidden=false;panel.querySelector('[data-shop-armory]').focus();}});
 panel.querySelector('[data-shop-armory]').addEventListener('click',()=>{options.hidden=true;armory.open();});
 function stepBack(){if(upgrades.active)upgrades.back();else if(armory.active)armory.close();else close();}
 const buttons=[...panel.querySelectorAll('.shop-options button')];let selected=0;
 function select(index){selected=index;buttons.forEach((button,i)=>button.classList.toggle('selected',i===index));}
 buttons.forEach((button,i)=>{button.addEventListener('pointerenter',()=>select(i));button.addEventListener('focus',()=>select(i));button.addEventListener('click',()=>select(i));});
 function close(){panel.hidden=true;onBack();}
 back.addEventListener('click',close);
 panel.addEventListener('contextmenu',event=>{if(panel.hidden)return;event.preventDefault();event.stopImmediatePropagation();stepBack();});
 return {get active(){return !panel.hidden;},get upgradesActive(){return upgrades.active;},back(){stepBack();},open(){panel.hidden=false;updateCredits();options.hidden=false;panel.querySelector('.shop-upgrades').hidden=true;panel.querySelector('.shop-armory').hidden=true;select(0);(buttons[0]||back).focus();},handleKey(event){if(armory.active){armory.handleKey(event);return;}if(upgrades.active){upgrades.handleKey(event);return;}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();event.stopImmediatePropagation();if(buttons.length){select((selected+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length);buttons[selected].focus();}}},close};
}
