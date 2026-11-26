export const trumpetBaseGain = 3.125; // LV1 gain; LV2/LV3 scale from this value.
/** Starting-weapon parts. Prices are base Credits at levels 1, 2 and 3. */
export const tuningPartCatalog = [{
  id:'power-tuning',name:'Power Tuning',weight:4,
  icon:'../sprites/icons/Event 06 - Buff 1.png',sellCredits:[50,100,150],
  levels:[
    {description:'Increase weapon base damage by 15% and crit damage by 5%.',damagePercent:15,critDamagePercent:5},
    {description:'Increase weapon base damage by 20% and crit damage by 10%.',damagePercent:20,critDamagePercent:10},
    {description:'Increase weapon base damage by 25% and crit damage by 15%.',damagePercent:25,critDamagePercent:15}
  ]
},{
  id:'explosive-tuning',name:'Explosive Tuning',weight:3,
  icon:'../sprites/icons/Event 06 - Buff 12.png',sellCredits:[50,100,150],
  levels:[10,20,30].map(chance=>({description:`Attacks have a ${chance}% chance to explode, dealing 30% weapon damage to nearby enemies. Once per projectile.`,explosionChance:chance/100}))
},{
  id:'critical-tuning',name:'Critical Tuning',weight:2,
  icon:'../sprites/icons/Unidentified Data Chip.png',sellCredits:[50,100,150],
  levels:[10,20,30].map(percent=>({description:`Increase this weapon's critical hit chance by ${percent}%. Stacks additively with other crit chance bonuses.`,critChancePercent:percent}))
},{
  id:'luxery-tuning',name:'Luxery Tuning',weight:3,
  icon:'../sprites/icons/Mansion Invitation.png',sellCredits:[50,100,150],
  levels:[3,4,5].map(percent=>({description:`Hits have a ${percent}% chance to drop Credits. Every 10 damage adds 1% chance, up to +10%. Drops 1 to 1 + bonus Credits.`,creditChancePercent:percent}))
},{
  id:'hasty-tuning',name:'Hasty Tuning',weight:2,
  icon:'../sprites/icons/Cheering Flag.png',sellCredits:[50,100,150],
  levels:[15,20,25].map(percent=>({description:`Reduce this weapon's time between attacks by ${percent}%. Multiplies with Haste.`,attackTimeReductionPercent:percent}))
},{
  id:'knockback-tuning',name:'Knockback Tuning',weight:3,
  icon:'../sprites/icons/Event 32 - Lost Item 17.png',sellCredits:[50,100,150],
  levels:[30,50,100].map((percent,index)=>({description:`Add small knockback, or increase existing knockback strength by ${percent}%.`,knockbackStrengthPercent:percent,knockbackFrames:[5,8,12][index],knockbackSpeed:[5,8,12][index]}))
},{
  id:'repair-tuning',name:'Repair Tuning',weight:1,
  icon:'../sprites/icons/Pipe Wrench.png',sellCredits:[50,100,150],
  levels:[5,10,15].map(percent=>({description:`Once per second, weapon hits have a 15% chance to heal a random amount up to ${percent}% Max HP. This is not life-steal.`,repairMaxHpPercent:percent}))
},{
  id:'speed-tuning',name:'Speed Tuning',weight:3,
  icon:'../sprites/icons/Event 41 - Slippers.png',sellCredits:[50,100,150],
  levels:[20,30,40].map(percent=>({description:`Decrease starting weapon damage by 20% and increase character SPD by ${percent}%.`,weaponDamagePenaltyPercent:20,characterSpeedPercent:percent}))
},{
  id:'neutralization-tuning',name:'Neutralization Tuning',weight:2,
  icon:"../sprites/icons/Warakuhime's Fan.png",sellCredits:[50,100,150],
  levels:[10,20,30].map((percent,index)=>({description:`Weapon hits have a ${percent}% chance to stun for 1 second and a ${20+index*10}% chance to erase eligible enemy projectiles. Erasure attempts have a 1-second cooldown per attack.`,stunChance:percent/100,eraseChance:(20+index*10)/100}))
},{
  id:'duel-trigger-tuning',name:'Duel Trigger Tuning',weight:1,maxLevel:2,
  icon:'../sprites/icons/Colorful Penlights.png',sellCredits:[50,100],
  levels:[1,2].map(count=>({description:`Add ${count} additional shot${count===1?'':'s'} to ranged Multishot starting weapons. Extra shots also split enhancement and Growth bonuses.`,extraProjectiles:count}))
},{
  id:'reverse-tuning',name:'Reverse Tuning',weight:3,
  icon:'../sprites/icons/Event 27 - Peroro Plush.png',sellCredits:[50,100,150],
  levels:[
    {description:'The wielder of the weapon will become upside down. There is no other effect.',reverseCount:1},
    {description:'The wielder of the weapon will become upside down of upside down, thereby now rendering this stamp completely pointless.',reverseCount:2},
    {description:'The wielder of the weapon will become upside down of upside down of upside down... how many times are you going to do this?',reverseCount:3}
  ]
},{
  id:'rgb-tuning',name:'RGB Tuning',weight:2,
  icon:'../sprites/icons/Peroro Mochi.png',sellCredits:[50,100,150],
  levels:[
    {description:'Weapon attacks will look pretty. There is no other effect.',rainbowTrail:1},
    {description:'Nothing happens from leveling this up. What are you expecting it to do, rainbow harder?',rainbowTrail:1},
    {description:"Please stop it already has all the colors we can't invent new colors.",rainbowTrail:1}
  ]
},{
  id:'size-up-tuning',name:'Size Up Tuning',weight:4,
  icon:'../sprites/icons/Cherino Matryoshka.png',sellCredits:[50,100,150],
  levels:[15,20,25].map(percent=>({description:`Increase starting-weapon attack size and projectile orbit radius by ${percent}%. Multiplies with other size bonuses.`,attackSizePercent:percent}))
},{
  id:'solo-tuning',name:'Solo Tuning',weight:9,weightBase:3,weightWeaponLimit:6,
  icon:'../sprites/icons/Rokuwakaku Model.png',sellCredits:[50,100,150],
  levels:[5,10,15].map(percent=>({description:`Increase starting-weapon base damage by ${percent}% for each empty weapon slot. Excludes flat enhancement and Growth damage.`,soloDamagePerEmptyPercent:percent}))
},{
  id:'trumpet-tuning',name:'Trumpet Tuning?',weight:2,
  icon:'../sprites/icons/mikalol.png',sellCredits:[50,100,150],
  levels:[
    {description:'Weapon will sound like a trumpet. There is no other effect.',dootCooldownFrames:8,get dootVolume(){return trumpetBaseGain;}},
    {description:'Weapon will doot harder.',dootCooldownFrames:6,get dootVolume(){return trumpetBaseGain*2;}},
    {description:'It will be harmful if this doots any louder.',dootCooldownFrames:4,get dootVolume(){return trumpetBaseGain*3;}}
  ]
},{
  id:'weapon-tuning',name:'Weapon Tuning',weight:1,
  icon:'../sprites/icons/Expo Souvenirs.png',sellCredits:[50,100,150],
  levels:[30,40,50].map((percent,index)=>({description:`Decrease starting-weapon damage by ${percent}%, but increase all other weapon damage by ${4+index*2}%.`,tradeoffMainPenaltyPercent:percent,tradeoffOtherDamagePercent:4+index*2}))
},{
  id:'weak-tuning',name:'Weak Tuning',weight:4,
  icon:'../sprites/icons/Souvenir Doll.png',sellCredits:[50,100,150],
  levels:[20,25,30].map((percent,index)=>({description:`Attacks have a ${percent}% chance to reduce target ATK by ${percent}% and DEF by ${[5,7,10][index]}% for 3 seconds. Kisaki.`,weakChance:percent/100,weakAttackPercent:percent,weakDefensePercent:[5,7,10][index]}))
}];
/** Cold damage is a single weapon-scaled hit when the freeze begins. */
export const coldTuningSettings={safeSeconds:4,freezeSeconds:3,procChance:.4,damageMode:"on-freeze"};
export const coldTuningDefinition={
  id:'cold-tuning',name:'Cold Tuning',weight:3,icon:'../sprites/icons/Wooden Doll - Nagusa.png',sellCredits:[50,100,150],
  levels:[50,60,70].map(percent=>({description:`On hit, after 4 seconds without being attacked by this target, 40% chance to freeze it for 3 seconds and deal ${percent}% weapon damage as cold damage.`,coldDamagePercent:percent}))
};

tuningPartCatalog.push(coldTuningDefinition);

/** First target per primary attack/projectile joins the shared mark network. */
export const targetTuningDefinition={
  id:'target-tuning',name:'Target Tuning',weight:9,weightBase:3,weightWeaponLimit:6,
  icon:'../sprites/icons/Marker Buoy.png',sellCredits:[50,100,150],
  levels:[20,25,30].map(percent=>({description:`The first target hit is marked and receives ${percent}% of damage dealt to other marked targets.`,targetPercent:percent}))
};

tuningPartCatalog.push(targetTuningDefinition);

export const explosiveTuningSettings = {radius:48,damageMultiplier:.3};
export const tuningPartSettings = {dropChance:1/780,slots:3,maxLevel:3,groundSize:64,lightOffsetY:8,pillarHeight:60};
export function createTuningRun(){return {equipped:[null,null,null],excluded:new Set()};}
export function eligibleTuningParts(run,catalog=tuningPartCatalog){return catalog.filter(p=>!run.excluded.has(p.id)&&!run.equipped.some(e=>e?.id===p.id));}
export function rollTuningPart(run,enemy,random=Math.random,catalog=tuningPartCatalog,bonusChance=0){
  const extra=Math.max(0,Math.min(1,bonusChance)),chance=extra?1-(1-tuningPartSettings.dropChance)*(1-extra):tuningPartSettings.dropChance;
  if(enemy.type!=='yuuka'&&random()>=chance)return null;
  const pool=eligibleTuningParts(run,catalog);if(!pool.length)return null;
  const weight=part=>Math.max(0,part.weight??1),total=pool.reduce((sum,part)=>sum+weight(part),0);
  if(!total)return null;
  let pick=Math.min(1-Number.EPSILON,Math.max(0,random()))*total;
  for(const part of pool){pick-=weight(part);if(pick<0)return {id:part.id,level:1};}
  return null;
}
export function equipTuningPart(run,part,index){
  if(!part||!Number.isInteger(part.level)||part.level<1||part.level>tuningPartMaxLevel(part)||!Number.isInteger(index)||index<0||index>=3||run.equipped.some((p,i)=>i!==index&&p?.id===part.id))return {ok:false};
  const previous=run.equipped[index];run.equipped[index]={...part};return {ok:true,previous};
}
export function tuningPartMaxLevel(part,catalog=tuningPartCatalog){
  const id=typeof part==='string'?part:part?.id,definition=catalog.find(item=>item.id===id);
  return definition?.maxLevel??definition?.levels.length??tuningPartSettings.maxLevel;
}
/** Shared firing/damage split count for future ranged Multishot starting weapons. */
export function startingWeaponProjectileCount(player,weaponId,baseCount=1){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null),weapon=player.attackSlots?.find(item=>item?.id===weaponId);
  const eligible=weaponId===main&&weapon?.ranged!==false&&String(weapon?.attackType).toLowerCase()==='multishot';
  return Math.max(1,baseCount)+(eligible&&player.tuningParts?tuningPerk(player.tuningParts,'extraProjectiles'):0);
}
export function strengthenTuningPart(run,consumed,index){
  const target=run.equipped[index];if(!target||!consumed||target===consumed||target.level>=tuningPartMaxLevel(target))return false;
  target.level++;run.excluded.add(consumed.id);return true;
}
export function tuningSellValue(part,player,catalog=tuningPartCatalog){
  const definition=catalog.find(p=>p.id===part.id),base=definition?.sellCredits?.[part.level-1];
  return Number.isFinite(base)?Math.floor(base*(player.stageCoinMultiplier??1)*(1+(player.moneyUpBonus||0)/100)):null;
}
/** Starting-weapon effects only; consumers request a perk explicitly, never alter character stats. */
export function tuningPerk(run,key,catalog=tuningPartCatalog){return run.equipped.reduce((sum,part)=>sum+(Number(catalog.find(p=>p.id===part?.id)?.levels?.[(part?.level||1)-1]?.[key])||0),0);}

/** Reverse Tuning now flips the wielder only; retained aim hook never changes attacks. */
export function startingWeaponAim(player,weaponId,angle){return angle;}
export function reverseTuningUpsideDown(player){
  return Boolean(player.tuningParts&&tuningPerk(player.tuningParts,'reverseCount')%2);
}

/** Shared dimensional multiplier for starting-weapon hit areas, visuals and orbit radii. */
export function startingWeaponSizeScale(player,weaponId){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null);
  return weaponId===main&&player.tuningParts?1+tuningPerk(player.tuningParts,'attackSizePercent')/100:1;
}

/** Bonus damage occurs once on application, not periodically. */
export const slowdownTuningSettings={seconds:5,damageMode:"on-application"};
export const slowdownTuningDefinition={
  id:'slowdown-tuning',name:'Slowdown Tuning',weight:4,
  icon:'../sprites/icons/Capybara Bath Salt.png',sellCredits:[50,100,150],
  levels:[15,20,25].map((percent,index)=>({description:`Attacks have a ${20+index*5}% chance to slow targets by ${percent}% for 5 seconds and immediately deal ${30+index*10}% weapon damage.`,slowChance:(20+index*5)/100,slowPercent:percent,slowDamagePercent:30+index*10}))
};

tuningPartCatalog.push(slowdownTuningDefinition);

/** Unfilled/omitted entries count as empty slots in the six-slot weapon inventory. */
export function emptyWeaponSlotCount(player,limit=6){
  return Math.max(0,limit-(player.attackSlots||[]).slice(0,limit).filter(Boolean).length);
}

/** Weapon Tuning is an explicit exception: its smaller benefit applies to other weapons. */
export function weaponTuningDamageBonus(player,weaponId){
  if(!player.tuningParts)return 0;
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null);
  return weaponId===main?-tuningPerk(player.tuningParts,'tradeoffMainPenaltyPercent'):tuningPerk(player.tuningParts,'tradeoffOtherDamagePercent');
}

export function tuningPartLevelLabel(part){
  return part.level>=tuningPartMaxLevel(part)?'MAX':`LV ${part.level}`;
}

/** Food substitution is reserved until random healing-food drops are defined. */
export const rateUpTuningDefinition={
  id:'rate-up-tuning',name:'Rate-Up Tuning',weight:2,icon:'../sprites/icons/Event 41 - Character Cushion.png',maxLevel:3,
  sellCredits:[50,100,150],
  levels:[1,2,3].map(percent=>({description:`Targets defeated within 2 seconds after this weapon hits them have a ${percent}% chance to drop a Tuning Part, with random healing food as a future alternative.`,rateUpChance:percent/100}))
};

export const rateUpFoodSettings={enabled:false,substitutionChance:null};
tuningPartCatalog.push(rateUpTuningDefinition);

/** Stationary bonuses activate from actual movement, not animation/facing. */
export const stationaryTuningDefinition={
  id:'stationary-tuning',name:'Stationary Tuning',weight:2,
  icon:'../sprites/icons/Mini Event - Toy Box.png',sellCredits:[50,100,150],
  levels:[20,25,30].map((percent,index)=>({description:`While not moving, increase starting-weapon damage by ${percent}% and reduce time between attacks of all weapons by ${30+index*10}%.`,stationaryDamagePercent:percent,stationaryTimeReductionPercent:30+index*10}))
};
tuningPartCatalog.push(stationaryTuningDefinition);
export function stationaryTuningActive(player){return player.stationaryForTuning??!player.moving;}
export function stationaryWeaponIntervalScale(player){
  return player.tuningParts&&stationaryTuningActive(player)?1-tuningPerk(player.tuningParts,'stationaryTimeReductionPercent')/100:1;
}
