import { rollLevelUpgrades } from './level-upgrades.js';
import { recordWeaponMax } from './weapon-max-order.js';

// Add actual super items here when their effects are defined. Empty pools fall back to normal Files.
export const superFileItems=[];
export const fileSettings={superChance:.05,tripleChance:.09,newChance:.1,weaponChance:.7,
  dropChance:0,bossGuaranteed:true,icon:'../sprites/icons/3 Stars Character Icon.png',maxGround:20,
  creditReplacementPerMax:.05,creditReplacementCap:.6};

/** Inclusive integer rolls and the supplied nested-floor Credits formula. */
export function fileCredits(type,random=Math.random,moneyUpBonus=0,stageMultiplier=1) {
  const [a,b]=type==='super'?[399,5]:type==='triple'?[399,3]:[301,1];
  const integer=max=>Math.min(max,Math.floor(random()*(max+1)));
  const multiplier=(1+moneyUpBonus/100)*stageMultiplier;
  return Math.floor(Math.floor(a/(3+integer(2)))*multiplier*(1+b*(20+integer(10))/100*multiplier));
}

/** Apply one accepted product without spending level-up choices; dropping never applies it. */
export function acceptFileProduct(player,product) {
  const slots=product.kind==='item'?(player.equipmentSlots??=[]):(player.attackSlots??=[]);
  const owned=slots.find(item=>item?.id===product.weapon.id);
  if(owned) {
    if(owned.isSynergy)return false;
    const max=owned.maxLevel||7;if((owned.level||1)>=max)return false;
    owned.level=(owned.level||1)+1;if(product.kind!=='item')recordWeaponMax(player,owned);return true;
  }
  const index=slots.findIndex(item=>!item);
  if(index<0&&slots.filter(Boolean).length>=6)return false;
  const item={...product.weapon};if(index>=0)slots[index]=item;else slots.push(item);return true;
}

/** Generate products using a shadow inventory so triple rewards cannot overfill or overlevel it. */
export function rollFileRewards(player,{random=Math.random,forceType,getOptions=rollLevelUpgrades,superItems=superFileItems}={}) {
  const roll=random();let type=forceType||(roll<fileSettings.superChance?'super':roll<fileSettings.superChance+fileSettings.tripleChance?'triple':'normal');
  const supers=superItems.filter(item=>!player.equipmentSlots?.some(owned=>owned?.id===item.id)&&
    (player.equipmentSlots||[]).filter(Boolean).length<6);
  if(type==='super'&&!supers.length)type='normal';
  const result={type,products:[],credits:fileCredits(type,random,player.moneyUpBonus||0,player.stageCoinMultiplier??1)};
  if(type==='super') {
    const item=supers[Math.min(supers.length-1,Math.floor(random()*supers.length))];
    result.products.push({kind:'item',weapon:{...item,level:1},name:item.name,super:true});return result;
  }
  const shadow={...player,attackSlots:(player.attackSlots||[]).map(w=>w?{...w}:null),equipmentSlots:(player.equipmentSlots||[]).map(w=>w?{...w}:null)};
  const free={weapon:6-shadow.attackSlots.filter(Boolean).length,item:6-shadow.equipmentSlots.filter(Boolean).length};
  for(let index=0;index<(type==='triple'?3:1);index++) {
    const maxed=[...shadow.attackSlots,...shadow.equipmentSlots].filter(w=>w&&(w.isSynergy||(w.level||1)>=(w.maxLevel||7))).length;
    // Editable saturation behavior: each MAX slot adds 5 percentage points toward the 100-Credit substitution.
    if(random()<Math.min(fileSettings.creditReplacementCap,maxed*fileSettings.creditReplacementPerMax)){result.credits+=100;continue;}
    const options=getOptions(shadow).filter(choice=>choice.weapon&&!choice.weapon.isSynergy);
    let selected=null;
    const allowNew=random()<fileSettings.newChance;
    for(let attempt=0;attempt<5&&!selected;attempt++) {
      let kind=random()<fileSettings.weaponChance?'weapon':'item';
      const pool=k=>options.filter(option=>{
        const category=/item|equipment/i.test(option.category||'')?'item':'weapon';
        const owned=(k==='item'?shadow.equipmentSlots:shadow.attackSlots).some(w=>w?.id===option.weapon.id);
        return category===k&&(owned||(allowNew&&free[k]>index));
      });
      let candidates=pool(kind);if(!candidates.length&&kind==='weapon'){kind='item';candidates=pool(kind);}
      if(candidates.length){const choice=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];selected={...choice,kind};}
    }
    if(selected&&acceptFileProduct(shadow,selected))result.products.push(selected);else result.credits+=100;
  }
  return result;
}
