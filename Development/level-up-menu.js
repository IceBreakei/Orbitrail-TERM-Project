import { levelActionUses, spendLevelAction, levelActionChoices } from './level-up-actions.js';
import { characterStatRows } from './character-stats-panel.js';
import { createBitmapText } from './bitmap-font.js';
import { applyEnhancedWeaponGlow } from './weapon-glow.js';
import { drawSynergyIcon } from './synergy-icon.js';
import { getArisWeapon } from './aris-weapon.js';
import { getUmbrella } from './weapon-progression.js';
import { levelUpgradeSettings } from './game-config.js';
import { rollLevelUpgrades, applyLevelUpgrade } from './level-upgrades.js';

const statRows = characterStatRows;

/** Pause on pending levels, present four upgrades, and resume after all choices are spent. */
export function createLevelUpMenu({ canvas, getPlayer, isPauseMenuOpen, releaseControls, onOpen, onChoose }) {
  const overlay = document.querySelector('#level-up-menu');
  const choicesElement = document.querySelector('#level-up-choices');
  const continueButton = document.querySelector('#level-up-continue');
  let player = null, choices = [], selected = 0, previousInert = [], actionMode = null;
  const actionBar=document.createElement('div');actionBar.className='level-up-actions';
  const actionButtons={};
  for(const action of ['reroll','eliminate','hold']){
    const button=document.createElement('button');button.type='button';actionButtons[action]=button;
    button.addEventListener('click',()=>{
      if(!player||!choices.length||!levelActionUses(player,action))return;
      if(action==='reroll'){spendLevelAction(player,action);actionMode=null;render();return;}
      actionMode=actionMode===action?null:action;
      text(document.querySelector('#level-up-help'),actionMode?`Choose an upgrade to ${actionMode}. Press Escape to cancel.`:'Choose an upgrade to continue.',.9);
      updateActions();select(selected);
    });actionBar.append(button);
  }
  continueButton.before(actionBar);
  function updateActions(){
    for(const [action,button] of Object.entries(actionButtons)){
      const uses=player?levelActionUses(player,action):0;
      text(button,`${action[0].toUpperCase()+action.slice(1)} (${uses})`,1.1);
      button.disabled=!choices.length||uses===0;button.setAttribute('aria-pressed',String(actionMode===action));
    }
  }
  const textRenderers = new WeakMap();
  const observers = new Map();

  /** Create accessible, wrapped sprite-font copy with consistent baselines. */
  function text(element, value, scale = 1.2) {
    let renderer = textRenderers.get(element);
    if (!renderer) {
      const graphic = document.createElement('canvas');
      element.replaceChildren(graphic);
      renderer = createBitmapText(graphic, { variant: 'font2', scale, outlineOverlap: 1,
        maxWidth: Math.max(100, element.clientWidth || 400), wrap: element.tagName === 'P' });
      textRenderers.set(element, renderer);

    }
    if (!observers.has(element)) {
      const observer = new ResizeObserver(() => renderer.setMaxWidth(Math.max(100, element.clientWidth)));
      observer.observe(element); observers.set(element, observer);
    }
    renderer.setText(value);
  }

  /** Highlight/focus a choice, supporting mouse and keyboard equally. */
  function select(index, focus = true) {
    if (!choices.length) { continueButton.focus({ preventScroll: true }); return; }
    selected = (index + choices.length) % choices.length;
    [...choicesElement.children].forEach((button, i) => {
      button.classList.toggle('selected', i === selected);
      button.tabIndex = i === selected ? 0 : -1;
    });
    if (focus) choicesElement.children[selected]?.focus({ preventScroll: true });
  }

  /** Apply once, then show the next queued level or return control to gameplay. */
  function choose(index) {
    if(!player||!choices[index])return;
    if(actionMode){
      if(!spendLevelAction(player,actionMode))return;
      const choice=choices[index];
      if(actionMode==='eliminate'){
        player.eliminatedUpgradeIds??=[];player.eliminatedUpgradeIds.push(choice.weapon?.id||choice.id);
        if(player.heldUpgradeId===choice.id)delete player.heldUpgradeId;
      }else{
        player.heldUpgradeId=choice.id;player.pendingUpgrades--;onChoose(player);
      }
      actionMode=null;if(player.pendingUpgrades>0)render();else close();return;
    }
    delete player.heldUpgradeId;
    if(!applyLevelUpgrade(player,choices[index].id))return;
    onChoose(player);
    if (player.pendingUpgrades > 0) render();
    else close();
  }

  /** Render character stats and a fresh choice set for one earned level. */
  function render() {
    for (const observer of observers.values()) observer.disconnect();
    observers.clear();
    text(document.querySelector('#level-up-title'), 'LEVEL UP!', 2);
    text(document.querySelector('#level-up-help'), 'Choose an upgrade to continue. Up / Down to select, Enter to confirm.', .9);
    text(document.querySelector('#level-up-name'), player.label, 1.3);
    const earnedLevel = player.level - player.pendingUpgrades + 1;
    text(document.querySelector('#level-up-progress'), `Level ${earnedLevel} - Choose an upgrade`, 1.1);
    const portrait = document.querySelector('#level-up-portrait');
    const label = player.label.toLowerCase();
    const source = label.includes('plana') ? '../sprites/Plana_Portrait.png'
      : label.includes('arona') ? '../sprites/Arona_Portrait.png' : '';
    portrait.hidden = !source;
    if (source) portrait.src = source;
    const stats = document.querySelector('#level-up-stats');
    stats.replaceChildren();
    for (const [name, icon, value] of statRows) {
      const row = document.createElement('div');
      row.className = 'level-up-stat';
      const image = document.createElement('img'); image.src = `../sprites/icons/${icon}`; image.alt = '';
      const nameElement = document.createElement('span'), valueElement = document.createElement('span');
      row.append(image, nameElement, valueElement); stats.append(row);
      text(nameElement, name, 1); text(valueElement, value(player), 1);
    }
    choices = levelActionChoices(player,rollLevelUpgrades(player,{all:true})).slice(0,levelUpgradeSettings.choices);
    choicesElement.replaceChildren();
    continueButton.hidden = choices.length > 0;
    if (!choices.length) text(document.querySelector('#level-up-help'), 'No upgrades available. Continue to resume.', .9);
    text(continueButton, 'Continue', 1.2);
    const weapon = getUmbrella(player) || getArisWeapon(player);
    const displayed = choices.length ? choices : weapon ? [{ name: `${weapon.name || "Weapon"} - MAX`, weapon,
      category: weapon.awakened ? 'Awakened' : 'LV 7',
      description: weapon.awakened ? 'This weapon is fully awakened.' : 'Maximum level reached. Collect a Secret Tech Note to awaken it.' }] : [];
    displayed.forEach((upgrade, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'level-up-choice';
      const rewardCategory = String(upgrade.category || '').toLowerCase();
      button.setAttribute('data-upgrade-kind', rewardCategory.includes('skill') ? 'skill' : rewardCategory.includes('item') || rewardCategory.includes('equipment') ? 'item' : 'weapon');
      button.setAttribute('aria-label', `${upgrade.name}. ${upgrade.description}`);
      const header = document.createElement('div'); header.className = 'level-up-choice-header';
      const title = document.createElement('span'), category = document.createElement('span');
      header.append(title, category);
      const body = document.createElement('div'); body.className = 'level-up-choice-body';
      const icon = document.createElement('canvas'); icon.width = icon.height = 128;
      icon.className = 'level-up-weapon-icon';
      if(upgrade.weapon.iconFit)icon.setAttribute('data-icon-fit','true');
      applyEnhancedWeaponGlow(icon,upgrade.weapon);
      icon.setAttribute('aria-label', upgrade.weapon.name || upgrade.name);
      if (upgrade.weapon.awakened || upgrade.id?.endsWith('-awaken')) icon.classList.add('awakened-icon');
      const image = new Image();
      image.onload = () => {
        if(drawSynergyIcon(icon,upgrade.weapon))return;
        const crop = upgrade.weapon.iconCrop || { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
        const context = icon.getContext('2d');
        const angle = (upgrade.weapon.iconRotation || 0) * Math.PI / 180;
        context.translate(64, 64); if(upgrade.weapon.iconFlipX)context.scale(-1,1); context.rotate(angle);
        const width = Math.abs(crop.width * Math.cos(angle)) + Math.abs(crop.height * Math.sin(angle));
        const height = Math.abs(crop.width * Math.sin(angle)) + Math.abs(crop.height * Math.cos(angle));
        const scale = (upgrade.weapon.iconFit?124:120) / Math.max(width, height);
        context.drawImage(image, crop.x, crop.y, crop.width, crop.height,
          -crop.width*scale/2, -crop.height*scale/2, crop.width*scale, crop.height*scale);
      };
      image.src = upgrade.weapon.icon;
      const description = document.createElement('p');
      body.append(icon, description); button.append(header, body); choicesElement.append(button);
      text(title, upgrade.name, 1.3); text(category, upgrade.category, 1); text(description, upgrade.description, 1.2);
      button.disabled = !choices.length;
      button.addEventListener('click', () => choose(index));
      button.addEventListener('pointerenter', () => select(index, false));
    });
    for (let i = displayed.length; i < levelUpgradeSettings.choices; i++) {
      const empty = document.createElement('div'); empty.className = 'level-up-empty-slot';
      empty.setAttribute('aria-hidden', 'true'); choicesElement.append(empty);
    }
    updateActions();select(0);
  }

  /** Restore developer controls only after the final queued level has been resolved. */
  function close() {
    player = null; actionMode=null; overlay.hidden = true;
    for (const observer of observers.values()) observer.disconnect();
    observers.clear();
    for (const [element, inert] of previousInert) element.inert = inert;
    previousInert = [];
    releaseControls(); canvas.focus({ preventScroll: true });
  }

  continueButton.addEventListener('click', () => {
    if (!player || choices.length) return;
    player.pendingUpgrades = 0;
    onChoose(player); close();
  });
  overlay.addEventListener('contextmenu', event => event.preventDefault());
  overlay.addEventListener('pointerdown', event => {
    if (event.button === 2) { event.preventDefault(); event.stopPropagation(); }
  });
  window.addEventListener('keydown', event => {
    if (!player || event.ctrlKey || event.metaKey || event.altKey) return;
    if(!overlay.contains?.(event.target))return;
    if(event.target?.closest?.('input, select, textarea, [contenteditable="true"]'))return;
    if (['ArrowUp', 'ArrowDown', 'w', 's', 'Enter', ' ', 'Escape'].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.repeat) return;
      if(event.key==='Escape'){actionMode=null;updateActions();text(document.querySelector('#level-up-help'),'Choose an upgrade to continue.',.9);return;}
      if(['Enter',' '].includes(event.key)&&event.target?.closest?.('.level-up-actions')){event.target.closest('button')?.click();return;}
      if (['ArrowUp', 'w'].includes(event.key)) select(selected - 1);
      if (['ArrowDown', 's'].includes(event.key)) select(selected + 1);
      if (['Enter', ' '].includes(event.key)) {
        if (choices.length) choose(selected); else continueButton.click();
      }
    }
  }, true);

  return {
    get active() { return player !== null; },
    update() {
      if (player || isPauseMenuOpen() || !(getPlayer().pendingUpgrades > 0)) return;
      player = getPlayer();
      releaseControls(); onOpen(); overlay.hidden = false;
      // Keep admin tools and the rest of the browser usable during upgrade selection.
      previousInert = [[canvas,canvas.inert]];
      canvas.inert = true;
      render();
    }
  };
}
