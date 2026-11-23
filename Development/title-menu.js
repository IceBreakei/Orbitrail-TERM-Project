import { createKitSelectionMenu } from './kit-selection-menu.js';
import { createDormMenu } from './dorm-menu.js';
import { createCreditsMenu } from './credits-menu.js';
import { createLeaderboardMenu } from './leaderboard-menu.js';
import { createAchievementsMenu } from './achievements-menu.js';
import { createShopMenu } from './shop-menu.js';
import { createBitmapText } from './bitmap-font.js';
/** Initial menu is local to the arena; browser and volume controls remain live. */
export function createTitleMenu({canvas,releaseControls=()=>{},onActiveChange=()=>{},getPlayer=()=>({}),getScores=()=>[],clearScores=()=>{},onChooseKit=()=>{}}){
 const root=document.querySelector('#title-menu');let active=true;
 const buttons=[...root.querySelectorAll('[data-title-action]')];let selected=Math.max(0,buttons.findIndex(button=>button.dataset.titleAction==='play'));
 const shop=createShopMenu({root,getPlayer,onBack:()=>buttons.find(b=>b.dataset.titleAction==='shop')?.focus()});
 const kits=createKitSelectionMenu({panel:root.querySelector('.kit-selection-menu'),getPlayer,onBack:()=>buttons.find(b=>b.dataset.titleAction==='play')?.focus(),onChoose:(id,run)=>{onChooseKit(id,run);active=false;root.hidden=true;onActiveChange(false);releaseControls();canvas.focus();}});
 const dorm=createDormMenu({panel:root.querySelector('.dorm-menu'),onBack:()=>buttons.find(b=>b.dataset.titleAction==='dorm')?.focus()});
 const credits=createCreditsMenu({panel:root.querySelector('.credits-menu'),onBack:()=>buttons.find(b=>b.dataset.titleAction==='credits')?.focus()});
 const leaderboard=createLeaderboardMenu({panel:root.querySelector('.leaderboard-menu'),getPlayer,getScores,clearScores,onBack:()=>buttons.find(b=>b.dataset.titleAction==='leaderboard')?.focus()});
 const achievements=createAchievementsMenu({panel:root.querySelector('.achievements-hub'),onBack:()=>buttons.find(b=>b.dataset.titleAction==='achievements')?.focus()});
 for(const node of root.querySelectorAll('[data-title-text]')){const graphic=document.createElement('canvas');graphic.width=380;graphic.height=40;graphic.setAttribute('aria-hidden','true');createBitmapText(graphic,{variant:'font2',scale:1.5,wrap:false,fitWidth:370}).setText(node.textContent);node.replaceChildren(graphic);}
 const settings=root.querySelector('.title-settings'),volume=root.querySelector('input'),mainVolume=document.querySelector('#music-volume');
 const value=root.querySelector('output'),valueCanvas=document.createElement('canvas');valueCanvas.width=100;valueCanvas.height=32;value.replaceChildren(valueCanvas);const valueText=createBitmapText(valueCanvas,{variant:'font2',scale:1.25,wrap:false});
 function sync(){volume.value=mainVolume.value;valueText.setText(`${volume.value}%`);value.setAttribute('aria-label',`${volume.value}%`);}
 sync();mainVolume.addEventListener('input',sync);volume.addEventListener('input',()=>{mainVolume.value=volume.value;mainVolume.dispatchEvent(new Event('input',{bubbles:true}));});
 function choose(index){selected=index;buttons.forEach((b,i)=>b.classList.toggle('selected',i===index));}
 function activate(button){if(button.dataset.titleAction==='play'){settings.hidden=true;kits.open();}else if(button.dataset.titleAction==='dorm'){settings.hidden=true;dorm.open();}else if(button.dataset.titleAction==='credits'){settings.hidden=true;credits.open();}else if(button.dataset.titleAction==='leaderboard'){settings.hidden=true;leaderboard.open();}else if(button.dataset.titleAction==='achievements'){settings.hidden=true;achievements.open();}else if(button.dataset.titleAction==='shop'){settings.hidden=true;shop.open();}else{settings.hidden=!settings.hidden;sync();}}
 buttons.forEach((button,i)=>{button.addEventListener('pointerenter',()=>choose(i));button.addEventListener('click',()=>activate(button));});choose(Math.max(0,buttons.findIndex(b=>b.dataset.titleAction==='play')));
 window.addEventListener('keydown',event=>{if(!active)return;if(kits.active){kits.handleKey(event);return;}if(dorm.active){dorm.handleKey(event);return;}if(credits.active){credits.handleKey(event);return;}if(leaderboard.active){leaderboard.handleKey(event);return;}if(achievements.active){achievements.handleKey(event);return;}if(shop.active){if(['Escape','Shift'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();shop.back();}else shop.handleKey(event);return;}if(event.target===volume)return;if(['ArrowLeft','ArrowRight','Enter',' ','Escape'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();if(event.key==='Escape'){settings.hidden=true;return;}if(event.key==='ArrowLeft'||event.key==='ArrowRight'){choose((selected+(event.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length);buttons[selected].focus();}else activate(buttons[selected]);}},true);
 releaseControls();return {get active(){return active;},startTesting(){kits.close();dorm.close();credits.close();achievements.close();leaderboard.close();shop.close();active=false;root.hidden=true;onActiveChange(false);releaseControls();canvas.focus();},show(){active=true;root.hidden=false;onActiveChange(true);shop.close();achievements.close();leaderboard.close();dorm.close();credits.close();kits.close();settings.hidden=true;choose(Math.max(0,buttons.findIndex(b=>b.dataset.titleAction==='play')));sync();releaseControls();buttons[selected].focus();}};
}
