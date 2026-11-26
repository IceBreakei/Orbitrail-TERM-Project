import { isContentUnlocked,unlockContent } from './item-catalog.js';
import { getLootTotals,spendCredits,gainCredits } from './exp-drops.js';
import { createBitmapText } from './bitmap-font.js';
import { abilityUpgradeCatalog } from './ability-upgrades.js';
import { statUpgradeCatalog } from './stat-upgrades.js';
import { otherUpgradeCatalog } from './other-upgrades.js';
export const shopUpgradeCategories=[{name:'Ability',entries:abilityUpgradeCatalog},{name:'Stats',entries:statUpgradeCatalog},{name:'Others',entries:otherUpgradeCatalog}];
// Temporary hand-drawn inline SVGs: no separate icon assets to replace later.
const upgradeIconShapes={
 heart:'<path fill="#ff6387" d="M24 39 7 22C-2 8 15 2 24 14 33 2 50 8 41 22Z"/>',
 sword:'<path fill="#c8edff" d="m11 34 22-27 9-3-2 10-24 24Z"/><path stroke="#ffd86d" d="m8 29 13 12M7 43l8-9"/>',
 boot:'<path fill="#77a5ff" d="M19 7h18l-4 20 10 7v7H8v-9l10-6Z"/><path d="M21 15h13M20 21h12"/>',
 target:'<circle cx="24" cy="24" r="15" fill="none"/><circle cx="24" cy="24" r="7" fill="none"/><path d="M24 3v12m0 18v12M3 24h12m18 0h12"/>',
 clock:'<circle cx="24" cy="25" r="16" fill="#537ab7"/><path d="M24 13v13l10 6M18 4h12"/>',
 shield:'<path fill="#70b5e6" d="m24 5 17 7-3 19-14 12-14-12-3-19Z"/>',
 coin:'<circle cx="24" cy="24" r="17" fill="#ffc653"/><ellipse cx="24" cy="24" rx="11" ry="14" fill="none"/><path d="M24 16v16"/>',
 star:'<path fill="#ffd45a" d="m24 4 6 13 15 2-11 10 3 15-13-7-13 7 3-15L3 19l15-2Z"/>',
 box:'<path fill="#9ec6dc" d="m7 15 17-8 17 8v23l-17 7-17-7Z"/><path d="m7 15 17 8 17-8M24 23v22"/>',
 flag:'<path fill="#70d5ff" d="M10 7h28l-5 9 5 9H10Z"/><path d="M10 5v38"/>',
};
const plus='<path stroke="#8bffaf" stroke-width="4" d="M37 29v14m-7-7h14"/>';
const ban='<circle cx="24" cy="24" r="19" fill="none" stroke="#ff526a" stroke-width="4"/><path stroke="#ff526a" stroke-width="4" d="m10 38 28-28"/>';
const upgradeTemporaryIcons={
 'special-attack':upgradeIconShapes.target,
 'growth':'<path fill="#69d5b2" d="M22 42V20C5 23 3 12 6 7c14-1 18 7 18 14 1-13 12-17 20-14 0 15-10 17-20 16"/>'+plus,
 'reroll':'<path fill="none" stroke="#71ddff" stroke-width="5" d="M39 19A16 16 0 0 0 10 14M9 29a16 16 0 0 0 29 5"/><path fill="#71ddff" d="m5 4 17 7-15 8m36 25-17-7 15-8"/>',
 'eliminate':'<path fill="#fb667e" d="M13 14h23l-3 29H16Z"/><path d="M8 11h33M19 6h11M21 19v17m7-17v17"/>',
 'tuning':'<path fill="#ffd16d" d="M10 7h28v34H10Z"/><path stroke="#835c23" d="M16 16h16M16 24h16M16 32h16"/><circle cx="21" cy="16" r="3"/><circle cx="28" cy="24" r="3"/><circle cx="20" cy="32" r="3"/>',
 'hold':'<path fill="#84d4ff" d="M10 7h10v34H10zm18 0h10v34H28Z"/>',
 'customize':'<path fill="#dcaaff" d="m7 34 20-23 10 10-20 23H7Z"/><path d="m26 12 6-7 10 10-6 7M7 43h34"/>',
 'supports':'<path fill="#78dca8" d="M7 13h34v28H7Z"/><path d="M17 13V7h14v6M24 20v14m-7-7h14"/>',
 'momo-chats':'<path fill="#ffadd5" d="M5 8h38v25H22L12 43V33H5Z"/><circle cx="14" cy="21" r="2"/><circle cx="24" cy="21" r="2"/><circle cx="34" cy="21" r="2"/>',
 'enchantments':'<path stroke="#cea2ff" stroke-width="7" d="m9 40 25-25"/><path fill="#ffe7a4" d="m34 4 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"/>',
 'student-council':'<path fill="#83c8ed" d="M7 17 24 5l17 12ZM10 21h6v16h-6zm11 0h6v16h-6zm11 0h6v16h-6zM6 41h36"/>',
 'max-hp-up':upgradeIconShapes.heart,
 'atk-up':upgradeIconShapes.sword,
 'spd-up':upgradeIconShapes.boot,
 'crit-up':upgradeIconShapes.target+'<path fill="#ffda70" d="m33 5 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
 'pick-up-range':'<circle cx="24" cy="24" r="18" fill="none" stroke="#7cdeff" stroke-dasharray="4 3"/><path fill="#b4a0ef" d="M11 13h8v16q5 8 10 0V13h8v17q-13 23-26 0Z"/>',
 'haste-up':upgradeIconShapes.clock+'<path fill="#ffe582" d="m27 9-11 18h9l-4 14 14-22h-10Z"/>',
 'regeneration':upgradeIconShapes.heart+plus,
 'defense-up':upgradeIconShapes.shield,
 'special-cooldown-reduction':upgradeIconShapes.clock+'<path stroke="#8dffc2" stroke-width="4" d="M30 34h14"/>',
 'skill-up':upgradeIconShapes.star+plus,
 'exp-gain-up':upgradeIconShapes.flag+plus,
 'food-drops-up':'<path fill="#f4c77c" d="M6 23q18-27 36 0Z"/><path fill="#79c987" d="M6 26h36v5H6Z"/><path fill="#c17b53" d="M6 32h36v5H6Z"/><path fill="#f4c77c" d="M6 38h36v5H6Z"/>',
 'credit-gain-up':upgradeIconShapes.coin+plus,
 'enhancement-rate-up':upgradeIconShapes.sword+plus,
 'customer-service':'<path fill="#e5f3ff" d="M10 4h28v40l-5-3-5 3-5-3-5 3-8-3Z"/><path stroke="#6682ab" d="M16 13h16M16 20h16M16 27h10"/>',
 'weapon-limit':upgradeIconShapes.sword+ban,
 'item-limit':upgradeIconShapes.box+ban,
 'synnergy-ban':'<path fill="#bd9eff" d="m13 5 27 35-7 5L6 11Zm22 0L8 40l7 5 27-34Z"/>'+ban,
 'supers-ban':upgradeIconShapes.star+ban,
 'hardcore':'<path fill="#ebf6ff" d="M9 23C0 0 48 0 39 23l-4 8v11H13V31Z"/><circle cx="17" cy="22" r="5" fill="#172d43"/><circle cx="31" cy="22" r="5" fill="#172d43"/><path stroke="#172d43" d="m21 31 3-5 3 5M19 36v6m10-6v6"/>',
 'refund-all':upgradeIconShapes.coin+'<path fill="none" stroke="#7df4a3" stroke-width="4" d="M7 31A20 20 0 0 1 36 6"/><path fill="#7df4a3" d="m36 1 8 10-14 1"/>',
};
export function temporaryUpgradeIcon(id){return `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="#e8f7ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${upgradeTemporaryIcons[id]||upgradeIconShapes.star}</svg>`;}
export function buySupportsUpgrade(){if(isContentUnlocked('supports'))return false;const cost=abilityUpgradeCatalog.find(entry=>entry.id==='supports').costs[0];if(!spendCredits(cost))return false;unlockContent('supports');return true;}
/** Browse the recorded upgrade definitions. Purchasing and applying ranks are separate from this menu. */
export function createUpgradeMenu({panel,onBack,onBalanceChange=()=>{},getPlayer=()=>({})}){
 const tabs=panel.querySelector('.upgrade-tabs'),grid=panel.querySelector('.upgrade-grid');let category=0,selected=0,cards=[],actionMode=false;
 const description=panel.querySelector('.upgrade-detail-description'),cost=panel.querySelector('.upgrade-detail-cost'),actions=panel.querySelector('.upgrade-actions');
 function rank(entry){return Math.max(0,Math.min(entry.costs.length,Number(getPlayer().abilityUpgradeRanks?.[entry.id])||0));}
 function price(entry){return rank(entry)>=entry.costs.length?'SOLD':String(entry.costs[rank(entry)]);}
 function commit(entry,next){const player=getPlayer();player.abilityUpgradeRanks??={};player.abilityUpgradeRanks[entry.id]=next;panel.dispatchEvent(new CustomEvent('shop-upgrade-change',{bubbles:true,detail:{id:entry.id,rank:next}}));}
 function updateActions(){const entry=shopUpgradeCategories[category].entries[selected],buy=panel.querySelector('[data-upgrade-buy]'),refund=panel.querySelector('[data-upgrade-refund]'),current=rank(entry);buy.disabled=entry.kind==='action'?false:current>=entry.costs.length||getLootTotals().credits<entry.costs[current];buy.title=entry.kind==='action'?'Refund all purchased upgrades':current>=entry.costs.length?'Fully purchased':`Buy rank ${current+1} for ${entry.costs[current]} Credits`;refund.disabled=entry.kind==='action'||current===0;}
 function setActionMode(active){updateActions();actionMode=active;description.hidden=active;cost.hidden=active;actions.hidden=!active;panel.classList.toggle('upgrade-purchase-mode',active);}
 function back(){if(actionMode)setActionMode(false);else{panel.hidden=true;onBack();}}
 function text(node,value,{highlight=false,wrap=false,maxWidth=null}={}){node.replaceChildren();const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');node.append(canvas);createBitmapText(canvas,{variant:'font2',scale:1.3,wrap,maxWidth,highlightStats:highlight}).setText(value);node.setAttribute('aria-label',value);}
 function placeholder(id){const icon=document.createElement('span');icon.className='upgrade-placeholder';icon.setAttribute('aria-hidden','true');icon.innerHTML=temporaryUpgradeIcon(id);return icon;}
 function select(index,{focus=false}={}){if(actionMode)return;selected=index;cards.forEach((card,i)=>{card.classList.toggle('selected',i===index);card.setAttribute('aria-pressed',String(i===index));});const entry=shopUpgradeCategories[category].entries[index];text(panel.querySelector('.upgrade-detail-name'),entry.name);panel.querySelector('.upgrade-detail-body > .upgrade-placeholder').innerHTML=temporaryUpgradeIcon(entry.id);text(panel.querySelector('.upgrade-detail-description'),entry.description,{highlight:true,wrap:true,maxWidth:640});text(panel.querySelector('.upgrade-detail-cost'),price(entry)==='SOLD'?'SOLD':`Cost: ${price(entry)} Credits`,{highlight:true});updateActions();if(focus)cards[index]?.focus();}
 function showCategory(index){setActionMode(false);category=index;[...tabs.children].forEach((tab,i)=>{tab.classList.toggle('selected',i===index);tab.setAttribute('aria-selected',String(i===index));});grid.replaceChildren();cards=shopUpgradeCategories[index].entries.map(entry=>{const card=document.createElement('button');card.type='button';card.className='upgrade-card';card.setAttribute('aria-label',`${entry.name}, ${entry.costs[0]} Credits`);card.title=entry.name;card.append(placeholder(entry.id));const info=document.createElement('span');info.className='upgrade-card-info';const pips=document.createElement('span');pips.className='upgrade-ranks';pips.setAttribute('aria-label',`${entry.costs.length} ranks`);for(let i=0;i<entry.costs.length;i++){const pip=document.createElement('i');if(i<rank(entry))pip.className='purchased';pips.append(pip);}const cost=document.createElement('span');cost.className='upgrade-cost';text(cost,price(entry),{highlight:true});info.append(pips,cost);card.append(info);const itemIndex=grid.children.length;card.addEventListener('pointerenter',()=>select(itemIndex));card.addEventListener('click',()=>{if(actionMode)setActionMode(false);select(itemIndex);setActionMode(true);});card.addEventListener('focus',()=>select(itemIndex));grid.append(card);return card;});select(0);}
 shopUpgradeCategories.forEach((group,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('role','tab');text(button,group.name);button.addEventListener('click',()=>showCategory(index));tabs.append(button);});
 function refreshPurchase(){const index=selected;onBalanceChange();showCategory(category);select(index);setActionMode(true);}
 function refundEntry(entry){const current=rank(entry);if(!current)return;commit(entry,current-1);gainCredits(entry.costs[current-1]);}
 panel.querySelector('[data-upgrade-buy]').addEventListener('click',()=>{
  const entry=shopUpgradeCategories[category].entries[selected],current=rank(entry);
  if(entry.kind==='action'){for(const group of shopUpgradeCategories)for(const item of group.entries)while(rank(item)>0)refundEntry(item);refreshPurchase();return;}
  if(current>=entry.costs.length||!spendCredits(entry.costs[current]))return;
  commit(entry,current+1);refreshPurchase();
 });
 panel.querySelector('[data-upgrade-refund]').addEventListener('click',()=>{refundEntry(shopUpgradeCategories[category].entries[selected]);refreshPurchase();});
 text(panel.querySelector('[data-upgrade-buy]'),'Buy');text(panel.querySelector('[data-upgrade-refund]'),'Refund');showCategory(0);
 return {get active(){return !panel.hidden;},open(){panel.hidden=false;showCategory(category);cards[0]?.focus();},close(){panel.hidden=true;onBack();},back,handleKey(event){const key=event.key;if(['Escape','Shift'].includes(key)){event.preventDefault();event.stopImmediatePropagation();back();return;}if(actionMode)return;const steps={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3};if(key in steps){event.preventDefault();event.stopImmediatePropagation();select(Math.max(0,Math.min(cards.length-1,selected+steps[key])),{focus:true});}}};
}
