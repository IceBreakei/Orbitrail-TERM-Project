import { createBitmapText } from './bitmap-font.js';
import { ensurePlayerStats } from './player-stats.js';

/** Shared stat labels, icons and formatting for Pause and Crafter screens. */
export const characterStatRows = [
  ['HP','Bond.png',p=>`${Math.ceil(p.hp)}/${p.maxHp}`],
  ['ATK','Tournament Water Gun.png',p=>`+${p.combatStats?.atkPercent||0}%`],
  ['SPD','Crew Whistle.png',p=>`+${p.combatStats?.spdPercent||0}%`],
  ['CRT','Event 27 - 10 Sided Dice.png',p=>`${Object.values(p.combatBuffs||{}).reduce((sum,buff)=>sum+(Number(buff?.critPercent)||0),p.combatStats?.critPercent||0)}%`],
  ['Pickup','Event 06 - Buff 14.png',p=>`+${p.combatStats?.pickupPercent||0}%`],
  ['Haste','Skill Book Node.png',p=>`+${p.combatStats?.hastePercent||0}%`]
];

/** Bind existing Pause markup, or build the identical holographic panel for another menu. */
export function createCharacterStatsPanel({root,portrait,nameCanvas,rowsContainer,scale=1}) {
  if(!portrait||!nameCanvas||!rowsContainer) {
    root.replaceChildren();
    portrait=document.createElement('img');portrait.className='pause-hologram';portrait.alt='';
    const content=document.createElement('div');content.className='pause-stat-content';
    nameCanvas=document.createElement('canvas');rowsContainer=document.createElement('div');
    content.append(nameCanvas,rowsContainer);root.append(portrait,content);
  }
  const name=createBitmapText(nameCanvas,{variant:'font2',scale:1.2*scale});
  rowsContainer.replaceChildren();
  const rows=characterStatRows.map(([label,file,value])=>{
    const row=document.createElement('div');row.className='pause-stat-row';
    const icon=document.createElement('img');icon.alt='';icon.src=`../sprites/icons/${file}`;
    const labelCanvas=document.createElement('canvas'),valueCanvas=document.createElement('canvas');
    const labelText=createBitmapText(labelCanvas,{variant:'font2',scale:1.1*scale});
    const valueText=createBitmapText(valueCanvas,{variant:'font2',scale:1.1*scale});
    labelText.setText(label);row.append(icon,labelCanvas,valueCanvas);rowsContainer.append(row);
    return {value,valueText};
  });
  return {
    /** Read the current character each time a menu opens; never reuse stale HP or bonuses. */
    update(player) {
      const character=ensurePlayerStats(player);name.setText(character.label||'Character');
      for(const row of rows)row.valueText.setText(row.value(character));
      const label=String(character.label||'').toLowerCase();
      const source=label.includes('plana')?'../sprites/Plana_Portrait.png':label.includes('arona')?'../sprites/Arona_Portrait.png':'';
      portrait.hidden=!source;if(source)portrait.src=source;
    }
  };
}
