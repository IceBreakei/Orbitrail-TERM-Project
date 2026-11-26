import {applyShopEffects} from './shop-effects.js';
import {initializeAccountSettings} from './account-settings.js';
import {getFirebaseAuth} from '../firebase-client.js';
import {isGuestSession} from '../guest-session.js';
import {hasAllContent} from '../admin-access.js';
import {createSaveStore} from './save-store.js';
import {contentFlag,saveContentRegistry} from './save-schema.js';
import {createCloudSaveAdapter} from './cloud-save.js';
import {configureItemUnlocks,refreshAccountUnlocks,isUnlockSimulation} from './item-catalog.js';
import {configureLootPersistence} from './exp-drops.js';
export async function initializeProgress(){
 let uid='guest',developer=false;if(!isGuestSession()){const {auth}=await getFirebaseAuth();uid=auth.currentUser?.uid||'guest';developer=hasAllContent(auth.currentUser);}
 const save=createSaveStore({uid,storage:sessionStorage});window.accountSave=save;
 if(uid!=='guest')try{await save.connect(await createCloudSaveAdapter(uid));}catch{save.offline();}
 const ids=()=>Object.keys(saveContentRegistry).filter(id=>save.snapshot.flags[contentFlag(id)]===1);
 // One-time read of the old per-UID local unlock list; never import another account or guest save.
 if(uid!=='guest'&&save.snapshot.flags['migration:local-unlocks-v1']!==1)try{for(const id of JSON.parse(localStorage.getItem('orbitrail.items.'+uid)||'[]')){const key=contentFlag(id);if(key)save.set('flags',key,1);}save.set('flags','migration:local-unlocks-v1',1);}catch{}
 const storage={getItem:()=>JSON.stringify(ids()),setItem:(key,value)=>{for(const id of JSON.parse(value)){const flag=contentFlag(id);if(flag){save.set('flags',flag,1);if(save.snapshot.ranks['upgrade:'+id]===0)save.set('ranks','upgrade:'+id,1);}}}};
 initializeAccountSettings(save);configureItemUnlocks(storage,uid,{developer});save.subscribe(()=>refreshAccountUnlocks(ids()));
 window.addEventListener('online',()=>{if(uid!=='guest')void createCloudSaveAdapter(uid).then(adapter=>save.connect(adapter)).catch(()=>{});});
 window.addEventListener('pagehide',()=>{void save.flush();});return save;
}
export function bindAccountProgress(save,{players,runScore,getPlayer=()=>players[0]}){
 const slider=document.querySelector('#music-volume'),toggle=document.querySelector('#music-soundtrack-toggle');
 function syncAudio(data){if(Number(slider.value)!==data.preferences.musicVolume){slider.value=data.preferences.musicVolume;slider.dispatchEvent(new Event('input',{bubbles:true}));}if((toggle.getAttribute('aria-pressed')==='true'?1:0)!==data.preferences.soundtrackSecondary)toggle.click();}
 const walletChanged=wallet=>{for(const [key,value]of Object.entries(wallet))save.set('wallet',key,value);},scoreChanged=scores=>save.replace('scores',scores);
 function apply(data){syncAudio(data);configureLootPersistence({initial:data.wallet,onChange:walletChanged});runScore.configurePersistence(data.scores,scoreChanged);for(const player of players){player.abilityUpgradeRanks=Object.fromEntries(Object.entries(data.ranks).map(([id,rank])=>[id.replace('upgrade:',''),rank]));applyShopEffects(player);for(const [type,field]of [['weapon','disabledWeaponIds'],['item','disabledItemIds']])player[field]=Object.keys(saveContentRegistry).filter(id=>saveContentRegistry[id]===type&&data.flags[contentFlag(id,true)]===1);}}
 apply(save.snapshot);save.subscribe(apply);
 slider.addEventListener('input',()=>save.set('preferences','musicVolume',Number(slider.value)));toggle.addEventListener('click',()=>save.set('preferences','soundtrackSecondary',toggle.getAttribute('aria-pressed')==='true'?1:0));
 window.addEventListener('shop-upgrade-change',event=>{
  const {id,rank}=event.detail||{};if(!Number.isInteger(rank)||rank<0)return;
  if(!save.set('ranks','upgrade:'+id,rank))return;
  const flag=contentFlag(id);if(flag)save.set('flags',flag,rank>0?1:0);
 });
 // Commit armoury clicks immediately so unrelated save updates cannot restore a stale list.
 window.addEventListener('armory-equipment-change',event=>{
  const {key,ids}=event.detail||{};const type=key==='disabledWeaponIds'?'weapon':key==='disabledItemIds'?'item':null;
  if(!type||!Array.isArray(ids)||isUnlockSimulation())return;
  const disabled=new Set(ids);
  for(const id of Object.keys(saveContentRegistry).filter(id=>saveContentRegistry[id]===type))save.set('flags',contentFlag(id,true),disabled.has(id)?1:0);
 });
 // Only account-level settings are captured; run level, loadout, HP and map/timer stay fresh.
 const timer=setInterval(()=>{if(isUnlockSimulation())return;const player=getPlayer(),ranks={...player.abilityUpgradeRanks},equipment={weapon:[...(player.disabledWeaponIds||[])],item:[...(player.disabledItemIds||[])]};for(const [id,rank]of Object.entries(ranks))save.set('ranks','upgrade:'+id,rank);for(const [type,field]of [['weapon','disabledWeaponIds'],['item','disabledItemIds']])for(const id of Object.keys(saveContentRegistry).filter(id=>saveContentRegistry[id]===type))save.set('flags',contentFlag(id,true),equipment[type].includes(id)?1:0);},1000);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
