import { goldenCrafterChoices } from './golden-crafter-rules.js';
import { applyEnhancedWeaponGlow } from './weapon-glow.js';
import { drawSynergyIcon } from './synergy-icon.js';
import { upgradeLevelLabel } from './upgrade-label.js';
import { createCharacterStatsPanel } from './character-stats-panel.js';
import { createBitmapText } from './bitmap-font.js';
import { crafterChoices } from './crafter-rules.js';
import { getLootTotals } from './exp-drops.js';
import { rollLevelUpgrades } from './level-upgrades.js';

/** Crop/rotate the actual inventory icon, matching the HUD rather than stretching a sheet. */
function inventoryIcon(target) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  canvas.className='crafter-inventory-icon';canvas.setAttribute('aria-hidden','true');
  applyEnhancedWeaponGlow(canvas,target);
  if(!target?.icon)return canvas;
  if(drawSynergyIcon(canvas,target))return canvas;
  const image=new Image();
  image.onload=()=>{
    const crop=target.iconCrop||{x:0,y:0,width:image.naturalWidth,height:image.naturalHeight};
    const angle=(target.iconRotation||0)*Math.PI/180;
    const width=Math.abs(crop.width*Math.cos(angle))+Math.abs(crop.height*Math.sin(angle));
    const height=Math.abs(crop.width*Math.sin(angle))+Math.abs(crop.height*Math.cos(angle));
    const scale=116/Math.max(width,height),context=canvas.getContext('2d');
    context.save();context.translate(64,64);context.rotate(angle);
    context.drawImage(image,crop.x,crop.y,crop.width,crop.height,-crop.width*scale/2,-crop.height*scale/2,crop.width*scale,crop.height*scale);context.restore();
  };
  image.src=target.icon;return canvas;
}

/** Two-row inventory selector, character stats and the currently selected upgrade preview. */
export function createCrafterMenu({canvas,getPlayer,onCancel,onAction,golden=false}) {
  const dialog=document.createElement('dialog');dialog.id=golden?'golden-crafter-menu':'crafter-menu';dialog.className=golden?'crafter-menu golden-crafter-menu':'crafter-menu';
  dialog.setAttribute('aria-labelledby',golden?'golden-crafter-title':'crafter-title');
  const layout=document.createElement('div');layout.className='crafter-layout';
  const stats=document.createElement('aside');stats.className='crafter-character pause-character-stats';stats.setAttribute('aria-label','Character stats');
  const work=document.createElement('section');work.className='crafter-workspace';
  const title=document.createElement('h2');title.id=golden?'golden-crafter-title':'crafter-title';
  const balance=document.createElement('p');balance.className='crafter-balance';
  const weapons=document.createElement('div'),equipment=document.createElement('div');
  for(const [row,label] of [[weapons,'Weapons'],[equipment,'Equipment']]){row.className='crafter-slot-grid';row.setAttribute('role','group');row.setAttribute('aria-label',label);}
  const detail=document.createElement('section');detail.className='crafter-upgrade-detail';detail.setAttribute('aria-live','polite');
  const modes=document.createElement('div');modes.className='crafter-action-modes';
  const footer=document.createElement('footer');footer.className='crafter-footer';
  const confirm=document.createElement('button');confirm.type='button';confirm.id=golden?'golden-crafter-confirm':'crafter-confirm';confirm.className='crafter-confirm';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='crafter-cancel';
  const help=document.createElement('p');help.className='crafter-key-help';
  footer.append(modes,confirm,cancel);work.append(title,balance,weapons,equipment,detail,footer,help);layout.append(stats,work);dialog.append(layout);document.body.append(dialog);
  if(golden)equipment.hidden=true;

  let selected=0,actionId=null,slotButtons=[],currentChoice=null,viewScale=1,picked=[];
  /** Use the supplied game font while retaining accessible button text. */
  function text(element,value,scale=1.3) {
    element.setAttribute('aria-label',value);element.replaceChildren();
    const graphic=document.createElement('canvas');graphic.setAttribute('aria-hidden','true');
    element.append(graphic);createBitmapText(graphic,{variant:'font2',scale:scale*viewScale,wrap:false}).setText(value);
  }
  /** Keep the modal exactly over the simulated game viewport, including fullscreen changes. */
  function align() {
    const rect=canvas.getBoundingClientRect?.();if(!rect)return;
    const previousScale=viewScale;viewScale=Math.min(1,rect.width/1280);
    dialog.style.left=`${rect.left}px`;dialog.style.top=`${rect.top}px`;
    dialog.style.width=`${rect.width}px`;dialog.style.height=`${rect.height}px`;
    if(dialog.open&&Math.abs(previousScale-viewScale)>.001)render();
  }
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(align).observe(canvas);
  if(typeof window!=='undefined'){window.addEventListener('resize',align);window.addEventListener('scroll',align,true);}
  /** Show the same six core stats used in the pause menu with a holographic portrait. */
  function renderStats(player) {
    createCharacterStatsPanel({root:stats,scale:viewScale}).update(player);
  }

  function targetAt(index) {return index<6?getPlayer().attackSlots?.[index]:getPlayer().equipmentSlots?.[index-6];}
  /** Selecting a slot changes only the preview; Confirm performs the one-use transaction. */
  function select(index,focus=false,resetAction=true) {
    if(golden&&slotButtons[index]?.disabled)return;
    selected=index;if(resetAction)actionId=null;
    slotButtons.forEach((button,i)=>{button.classList.toggle('selected',i===selected);button.setAttribute('aria-pressed',String(i===selected));button.tabIndex=i===selected?0:-1;});
    renderDetail();if(focus)slotButtons[selected]?.focus({preventScroll:true});
  }
  function renderDetail() {
    const player=getPlayer(),target=targetAt(selected),prefix=`${selected<6?'weapon':'item'}:${selected%6}:`;
    const available=golden?goldenCrafterChoices(player).filter(choice=>picked.length===2&&picked.every(index=>choice.slots.includes(index))):crafterChoices(player).filter(choice=>choice.id.startsWith(prefix));
    currentChoice=available.find(choice=>choice.id===actionId)||available[0]||null;
    actionId=currentChoice?.id||null;
    slotButtons.forEach((button,index)=>{
      const paired=Boolean(golden&&picked.includes(index));
      button.classList.toggle('fusion-partner',paired&&index!==selected);
      button.classList.toggle('golden-wind-active',paired);
    });
    detail.replaceChildren();modes.replaceChildren();
    const heading=document.createElement('div');heading.className='crafter-detail-heading';
    const name=document.createElement('h3'),category=document.createElement('span');
    const displayTarget=golden&&currentChoice?currentChoice.target:target;
    const levelText=currentChoice?.id.endsWith(':level')?upgradeLevelLabel(target):`LV ${target?.level||1}${target?.enhancementRank?` +${target.enhancementRank}`:''}`;
    text(name,golden&&currentChoice?currentChoice.name:target?`${target.name||target.id||'Equipment'} ${levelText}`:'Empty slot',1.4);
    text(category,golden?'>> Synergy':selected<6?'>> Weapon':'>> Equipment',1.05);heading.append(name,category);
    const body=document.createElement('div');body.className='crafter-detail-body';
    const icon=inventoryIcon(displayTarget),description=document.createElement('div');
    let info=golden?'No compatible MAX-level weapon pair.':'Select an equipped weapon or item.';
    if(target&&!currentChoice)info=golden?'No compatible MAX-level weapon pair.':'Maximum level reached. No upgrade is available.';
    if(currentChoice) {
      if(golden)info=`${currentChoice.slots.map(index=>player.attackSlots[index].name||player.attackSlots[index].id).join(' + ')}: ${currentChoice.description||`Create ${currentChoice.name}`}`;
      else if(currentChoice.id.endsWith(':level'))info=rollLevelUpgrades(player).find(choice=>choice.weapon===target)?.description||`Upgrade to LV ${(target.level||1)+1}.`;
      else if(currentChoice.id.endsWith(':awaken'))info='Awaken the main weapon. Requires 1 Secret Tech Note.';
      else info=`Add 2 base damage per enhancement rank, split across primary projectiles. ${currentChoice.cost} Credits. ${Math.round(currentChoice.chance*100)}% success.`;
    }
    // Wrap long explanations using the bitmap renderer instead of browser fonts.
    const graphic=document.createElement('canvas');description.setAttribute('aria-label',info);description.append(graphic);
    createBitmapText(graphic,{variant:'font2',scale:1.2*viewScale,wrap:true,maxWidth:600*viewScale,highlightStats:true}).setText(info);
    if(golden) {
      // Selecting either compatible weapon previews both ingredients in named boxes.
      const pair=document.createElement('div');pair.className='golden-fusion-preview';
      for(let i=0;i<2;i++) {
        if(i){const plus=document.createElement('span');text(plus,'+',2);pair.append(plus);}
        const ingredient=picked[i]!==undefined?player.attackSlots[picked[i]]:null;
        const card=document.createElement('div');card.className='golden-fusion-ingredient';
        const label=document.createElement('p');text(label,ingredient?.name||'Select weapon',1.2);
        const box=document.createElement('div');box.className='golden-fusion-box';
        box.append(inventoryIcon(ingredient));box.addEventListener('click',()=>{if(picked[i]!==undefined){picked.splice(i,1);render();}});card.append(label,box);pair.append(card);
      }
      detail.append(pair);
      if(!currentChoice&&goldenCrafterChoices(player).length===0)detail.append(description);
    } else {body.append(icon,description);detail.append(heading,body);}
    for(const choice of available) {
      if(available.length<2)break;
      const button=document.createElement('button');button.type='button';button.className='crafter-mode';
      button.classList.toggle('selected',choice.id===actionId);text(button,golden?choice.name:choice.id.endsWith(':awaken')?'Awaken':'Enhance',1.1);
      button.addEventListener('click',()=>{actionId=choice.id;renderDetail();});modes.append(button);
    }
    confirm.disabled=!currentChoice||currentChoice.disabled;
    const confirmLabel=currentChoice?.id.endsWith(':enhance')?`Enhance +${currentChoice.rank}`:currentChoice?.id.endsWith(':level')?upgradeLevelLabel(target):currentChoice?.label||'Unavailable';
    text(confirm,golden?'SYNNERGIZE!':confirmLabel,golden?1.7:1.1);
    const loot=getLootTotals();text(balance,`Credits: ${loot.credits}   Secret Tech Notes: ${loot.secretTechNotes}`,1.05);
  }
  function render() {
    const player=getPlayer();renderStats(player);slotButtons=[];
    const eligibleSlots=new Set(golden?goldenCrafterChoices(player).filter(choice=>picked.length!==1||choice.slots.includes(picked[0])).flatMap(choice=>choice.slots):[]);weapons.replaceChildren();equipment.replaceChildren();
    text(title,golden?'SYNNERGIZE!':'UPGRADE!',2.8);text(cancel,'Cancel',1.2);text(help,'CONFIRM: SPACE / ENTER   |   CANCEL: SHIFT / ESC',.9);
    for(let index=0;index<12;index++) {
      const target=targetAt(index),button=document.createElement('button');button.type='button';button.className='crafter-slot';
      button.disabled=!target||(golden&&(index>=6||!eligibleSlots.has(index)));button.setAttribute('aria-label',target?`${target.name||target.id}, LV ${target.level||1}`:`Empty ${index<6?'weapon':'equipment'} slot ${index%6+1}`);
      button.append(inventoryIcon(target));
      if(target?.level){const level=document.createElement('span');level.className='crafter-slot-level';text(level,`LV ${target.level}${target.enhancementRank?` +${target.enhancementRank}`:''}`,.8);button.append(level);}
      button.addEventListener('click',()=>{
        if(button.disabled)return;
        if(golden){
          const existing=picked.indexOf(index);
          if(existing>=0)picked.splice(existing,1);
          else if(picked.length<2)picked.push(index);
          else picked=[picked[0],index];
          selected=index;actionId=null;render();
        } else select(index);
      });slotButtons.push(button);(index<6?weapons:equipment).append(button);
    }
    if(!targetAt(selected)||slotButtons[selected]?.disabled)selected=slotButtons.findIndex(button=>!button.disabled);
    if(golden&&selected<0)renderDetail();else select(Math.max(0,selected),false,false);
  }
  confirm.addEventListener('click',()=>{if(currentChoice&&!currentChoice.disabled)onAction(currentChoice.id);});
  cancel.addEventListener('click',onCancel);
  dialog.addEventListener('cancel',event=>{event.preventDefault();onCancel();});
  dialog.addEventListener('contextmenu',event=>{event.preventDefault();onCancel();});
  dialog.addEventListener('keydown',event=>{
    if(golden&&(event.key==='Enter'||event.key===' ')&&!event.repeat&&event.target.classList?.contains('crafter-slot')) {
      event.preventDefault();event.target.click();return;
    }
    if(event.key==='Shift'&&!event.repeat){event.preventDefault();onCancel();return;}
    const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-6,ArrowDown:6}[event.key];
    if(step){event.preventDefault();for(let n=1;n<=12;n++){const index=(selected+step*n+144)%12;if(targetAt(index)&&!slotButtons[index].disabled){select(index,true);break;}}}
    if((event.key==='Enter'||event.key===' ')&&!event.repeat&&!event.target.classList?.contains('crafter-mode')&&event.target!==cancel){event.preventDefault();if(currentChoice&&!currentChoice.disabled)onAction(currentChoice.id);}
  });
  return {open(){picked=[];selected=golden?goldenCrafterChoices(getPlayer())[0]?.slots[0]??0:0;actionId=null;align();dialog.showModal();render();(slotButtons.find(button=>!button.disabled)||cancel).focus();},
    refresh:render,close(){dialog.close();},get element(){return dialog;}};
}
