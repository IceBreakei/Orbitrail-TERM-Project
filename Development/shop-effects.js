/** Purchased ranks are authoritative. Content unlocks never grant free shop ranks. */
export function shopRank(player,id,max=10){return Math.max(0,Math.min(max,Math.trunc(Number(player.abilityUpgradeRanks?.[id])||0)));}
export function applyShopEffects(player){
 const rank=(id,max)=>shopRank(player,id,max);
 const stats=player.combatStats??={};
 for(const key of ['atkPercent','spdPercent','pickupPercent','hastePercent'])stats[key]??=0;
 stats.critPercent??=player.baseCritPercent??0;
 let applied=player.shopApplied;
 if(!applied||applied.stats!==stats)applied=player.shopApplied={stats,bonuses:{},properties:{},hp:0};
 const bonuses={atkPercent:6*rank('atk-up'),spdPercent:6*rank('spd-up'),critPercent:2*rank('crit-up',5),pickupPercent:10*rank('pick-up-range'),hastePercent:4*rank('haste-up',5)};
 for(const [key,value]of Object.entries(bonuses)){stats[key]+=value-(applied.bonuses[key]||0);applied.bonuses[key]=value;}
 const properties={skillDamageBonusPercent:4*rank('skill-up'),enhancementRateBonusPercent:3*rank('enhancement-rate-up',5),moneyUpBonus:20*rank('credit-gain-up')};
 for(const [key,value]of Object.entries(properties)){player[key]=(player[key]||0)+value-(applied.properties[key]||0);applied.properties[key]=value;}
 player.growthRank=rank('growth',3);
 player.shopDefensePercent=3*rank('defense-up',5);
 player.shopExpMultiplier=1+.04*rank('exp-gain-up',5);
 player.shopCooldownMultiplier=1-.03*rank('special-cooldown-reduction',5);
 player.shopRegeneration=rank('regeneration',5);
 player.customerServiceSpawns=rank('customer-service',5);
 player.maxWeaponSlots=6-rank('weapon-limit',5);player.maxItemSlots=6-rank('item-limit',6);
 player.weaponLimit=player.maxWeaponSlots;
 player.synnergyBan=rank('synnergy-ban',1)>0;player.supersBan=rank('supers-ban',1)>0;
 player.hardcore=rank('hardcore',1)>0;
 if(player.shopUnlocks?.supports&&!rank('supports',1))delete player.supportState;
 player.shopUnlocks=Object.fromEntries(['special-attack','tuning','customize','supports','momo-chats','enchantments','student-council'].map(id=>[id,rank(id,1)>0]));
 if(Number.isFinite(player.maxHp)){
  if(player.hardcore){
   if(!applied.hardcore)applied.normalMaxHp=player.maxHp;
   player.maxHp=1;player.hp=Math.min(player.hp??1,1);applied.hardcore=true;
  }else{
   if(applied.hardcore){player.maxHp=applied.normalMaxHp;applied.hardcore=false;}
   const base=player.maxHp-applied.hp-(player.racerPassHpApplied||0),bonus=Math.round(base*.04*rank('max-hp-up'));
   player.maxHp+=bonus-applied.hp;player.hp=Math.min(player.hp??player.maxHp,player.maxHp);applied.hp=bonus;
  }
 }
 return player;
}
export function updateShopEffects(player,delta){
 applyShopEffects(player);
 if(!(player.hp>0)||player.hardcore||!player.shopRegeneration){player.shopRegenElapsed=0;return;}
 player.shopRegenElapsed=(player.shopRegenElapsed||0)+Math.max(0,delta);
 while(player.shopRegenElapsed>=5){player.shopRegenElapsed-=5;player.hp=Math.min(player.maxHp,player.hp+player.shopRegeneration);}
}
