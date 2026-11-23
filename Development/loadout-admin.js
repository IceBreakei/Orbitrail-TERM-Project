import { syncRacerPassHealth, syncLifeJacketShield, updateSportsDrink } from './item-catalog.js';
import { recordWeaponMax } from './weapon-max-order.js';
import { createSportsDrink, sportsDrinkDescription, createMalkuthHat, createRacerPass, createSafetyHelmet, createLifeJacket, createChisePlushie, createOverheatedOverclocking, createSpecialPharmaceuticals } from './item-catalog.js';
/** Repeat equip clicks level owned basic weapons; never awaken or enhance them. */
export function equipAdminWeapon(player,createWeapon){
  const candidate=createWeapon(),slots=player.attackSlots??=[],owned=slots.find(w=>w?.id===candidate.id);
  if(owned){
    const maximum=owned.isSynergy?1:(owned.maxLevel??candidate.maxLevel??7);
    const next=Math.min(maximum,(owned.level||1)+1);
    if(next>(owned.level||1)){owned.level=next;recordWeaponMax(player,owned);}
    return true;
  }
  const empty=slots.findIndex(w=>!w);
  if(empty>=0)slots[empty]=candidate;else if(slots.length<6)slots.push(candidate);else return false;
  recordWeaponMax(player,candidate);return true;
}
/** Manual equips bypass reward unlocks without permanently unlocking items. */
export function equipAdminItem(player,item){
  const slots=player.equipmentSlots??=[],owned=slots.findIndex(owned=>owned?.id===item.id),empty=slots.findIndex(owned=>!owned);
  const index=owned>=0?owned:empty>=0?empty:slots.length;
  if(index>=6)return false;
  const current=owned>=0?slots[owned]:null;
  if(current&&!item.isSuper&&!item.awakened){
    if(!current.isSuper&&!current.awakened){
      const maximum=current.maxLevel??item.maxLevel??3;
      if((current.level||1)<maximum)current.level=(current.level||1)+1;
      else if(item.id==='sports-drink')slots[index]=createSportsDrink(true);
      else if(item.id==='malkuth-hat')slots[index]=createMalkuthHat(true);
      else if(item.id==='racer-pass')slots[index]=createRacerPass(true);
      else if(item.id==='safety-helmet')slots[index]=createSafetyHelmet(true);
      else if(item.id==='life-jacket')slots[index]=createLifeJacket(true);
      else if(item.id==='overheated-overclocking')slots[index]=createOverheatedOverclocking(true);
    }
  }else if(!current||!current.isSuper&&!current.awakened){slots[index]={...item};}
  return true;
}
export function createItemEquipAdmin({root,getPlayer,onChange=()=>{}}){
  const status=document.createElement('p');status.className='admin-equip-status';status.setAttribute('role','status');
  const options=[
    {label:"Equip Sports Drink",create:()=>createSportsDrink()},
    {label:"Equip Malkuth's Hat",create:()=>createMalkuthHat()},
    {label:'Equip Racer Pass',create:()=>createRacerPass()},
    {label:'Equip Safety Helmet',create:()=>createSafetyHelmet()},
    {label:'Equip Life Jacket',create:()=>createLifeJacket()},
    {label:'Equip Chise Plushie',create:()=>createChisePlushie()},
    {label:'Equip Special Pharmaceuticals',create:()=>createSpecialPharmaceuticals()},
    {label:'Equip Overheated Overclocking',create:()=>createOverheatedOverclocking()}
  ];
  for(const option of options){
    const button=document.createElement('button');button.type='button';button.textContent=option.label;button.title='Equip, level up, then click once more at MAX for its defined Super/Awakened form.';
    button.addEventListener('click',()=>{
      const player=getPlayer(),item=option.create();
      if(!equipAdminItem(player,item)){status.textContent='No empty equipment slot available.';return;}
      const equipped=player.equipmentSlots.find(owned=>owned?.id===item.id);
      onChange(player);status.textContent=`${equipped.name} ${equipped.isSuper||equipped.awakened?'Super / Awakened':equipped.level>=equipped.maxLevel?'MAX':`LV ${equipped.level}`} equipped.`;
    });root.append(button);
  }
  const hint=document.createElement('p');hint.textContent="Malkuth's Hat unlock: defeat Arisu. Racer Pass is unlocked by default. Admin equips bypass locks.";
  root.append(hint,status);
}

/** Clear the selected test character's complete gear loadout, including its starter. */
export function clearAdminLoadout(player){
 player.attackSlots=[];player.equipmentSlots=[];
 syncRacerPassHealth(player);syncLifeJacketShield(player);updateSportsDrink(player,0);
}
