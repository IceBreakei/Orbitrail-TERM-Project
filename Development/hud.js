import { createBitmapText, glyphRectangle } from './bitmap-font.js';
import { getLootTotals } from './exp-drops.js';
import { getKillCount } from './world-state.js';
import { applyEnhancedWeaponGlow } from './weapon-glow.js';
import { drawSynergyIcon } from './synergy-icon.js';

/** Reserve only visible caption ink, accounting for the slot art's top padding. */
export function levelCaptionSpacing(slotWidth, text) {
  const glyphs = [...text].filter(letter => letter !== ' ').map(glyphRectangle);
  const textWidth = [...text].reduce((sum, letter) => sum +
    (letter === ' ' ? 3 : glyphRectangle(letter).width - 1), 1);
  const inkBottom = Math.max(...glyphs.map(glyph => glyph.offsetY + glyph.height));
  const nextBoxInset = slotWidth * (1 - 237 / 255) / 2;
  return Math.max(0, slotWidth * 0.9 * inkBottom / textWidth - 6 - nextBoxInset);
}

/** Keep the equipment frame 2px below the lowest visible attack-level outline. */
function updateCaptionRowSpacing(container, entries) {
  const visible=entries.filter(entry=>!entry.caption.hidden);
  if(!visible.length){container.style.setProperty('--level-space','0px');return;}
  const textWidth=text=>[...text].reduce((sum,letter)=>sum+(letter===' '?3:glyphRectangle(letter).width-1),1);
  // Scale the entire row together. Fitting each label independently makes LV1 and LV7
  // different heights because their digit glyphs have different widths.
  const scale=Math.min(...visible.map(entry=>entry.slot.getBoundingClientRect().width*.9/textWidth(entry.captionText)));
  let spacing = 0;
  for (const entry of visible) {
    entry.caption.style.width=`${textWidth(entry.captionText)*scale}px`;
    entry.caption.style.height=`${20*scale}px`;
    const inkBottom=Math.max(...[...entry.captionText].filter(letter=>letter!==' ').map(letter=>{
      const glyph=glyphRectangle(letter);return glyph.offsetY+glyph.height;
    }));
    const nextBoxInset=entry.slot.getBoundingClientRect().width*(1-237/255)/2;
    spacing=Math.max(spacing,inkBottom*scale-6-nextBoxInset);
  }
  container.style.setProperty('--level-space', `${spacing}px`);
}

/** Arrange HUD values/portrait without introducing combat or experience mechanics. */
export function createHud(getFrameRectangle) {
  const exp = document.querySelector('#hud-exp');
  const expFill = document.querySelector('#hud-exp-fill');
  const expEdge = document.querySelector('#hud-exp-edge');
  const hp = document.querySelector('#hud-hp');
  const hpFill = document.querySelector('#hud-hp-fill');
  const shieldFill = document.querySelector('#hud-shield-fill');
  const shieldEdge = document.querySelector('#hud-shield-edge');
  const hpNumbers = createBitmapText(document.querySelector('#hud-hp-numbers'), { scale: 1 });
  const portrait = document.querySelector('#hud-portrait');
  const level = createBitmapText(document.querySelector('#hud-level'));
  const creditsText = createBitmapText(document.querySelector('#hud-credits'), { scale: 1.25 });
  const killsText = createBitmapText(document.querySelector('#hud-kills'), { scale: 1.25 });
  const context = portrait.getContext('2d');
  let previousImage;
  let previousName;
  const profiles = new Map();
  let activeCharacter;

  /** Create six compact slots per row once, then update only changed artwork. */
  function createSlots(container, type) {
    const entries = Array.from({ length: 6 }, (_, index) => {
      const slot = document.createElement('div');
      slot.className = 'hud-slot';
      slot.setAttribute('role', 'img');
      const base = document.createElement('img');
      base.alt = '';
      const icon = document.createElement('canvas');
      icon.width = icon.height = 128;
      icon.className = 'hud-slot-icon';
      icon.hidden = true;
      const caption = document.createElement('canvas');
      caption.className = 'hud-slot-level';
      caption.hidden = true;
      const levelText = createBitmapText(caption, { scale: 1, fitWidth: '90%' });
      const cooldown = document.createElement('div');
      cooldown.className = 'hud-slot-cooldown';
      cooldown.hidden = true; cooldown.setAttribute('aria-hidden', 'true');
      slot.append(base, cooldown, icon, caption);
      container.append(slot);
      return { slot, base, icon, caption, cooldown, levelText, type, index, previous: null, container };
    });
    const observer = new ResizeObserver(() => updateCaptionRowSpacing(container, entries));
    observer.observe(container);
    return entries;
  }
  const attackSlots = createSlots(document.querySelector('#hud-attack-slots'), 'attack');
  const equipmentSlots = createSlots(document.querySelector('#hud-equipment-slots'), 'equipment');

  /** Occupied slots use a blank base so placeholder swords/clothes never show through. */
  function updateSlots(slots, items = []) {
    let changed = false;
    for (const entry of slots) {
      const item = items[entry.index];
      entry.slot.classList.toggle('weapon-awakened', Boolean(item?.awakened));
      entry.slot.classList.toggle('weapon-synergy',entry.type==='attack'&&Boolean(item?.isSynergy));
      applyEnhancedWeaponGlow(entry.icon,item);
      const source = item?.icon || '';
      const remaining = item?.skillCooldownRemaining || 0;
      entry.cooldown.hidden = remaining <= 0;
      const duration = Math.max(1, item?.skillCooldownDuration || 1);
      entry.cooldown.style.setProperty('--cooldown-sweep', `${Math.max(0, Math.min(1, 1 - remaining / duration)) * 360}deg`);
      entry.slot.setAttribute('aria-description', remaining > 0 ? `Skill cooldown ${Math.ceil(remaining)} seconds` : '');
      const label = source ? item.name || `${entry.type} ${entry.index + 1}`
        : `Empty ${entry.type} slot ${entry.index + 1}`;
      const starterId=activeCharacter?.mainWeaponId??(activeCharacter?.label==='Plana'?'plana-umbrella':null);
      const levelLabel=entry.type==='attack'&&!item?.isSynergy&&item?.level>=7&&item.id!==starterId?'MAX':`LV ${item?.level}`;
      const key = JSON.stringify([source, label, item?.iconCrop, item?.iconRotation, item?.level, item?.awakened, item?.enhancementRank,levelLabel,item?.synergyTopWeaponId]);
      if (entry.previous === key) continue;
      changed = true;
      entry.previous = key;
      entry.base.src = `../sprites/hud/${source ? 'empty' : entry.type}-slot.png`;
      entry.icon.hidden = !source;
      entry.caption.hidden = !source || item?.level === undefined;
      if (!entry.caption.hidden) {
        entry.captionText = levelLabel;
        entry.levelText.setText(entry.captionText);
      }
      const iconContext = entry.icon.getContext('2d');
      iconContext.clearRect(0, 0, 128, 128);
      if (source&&!drawSynergyIcon(entry.icon,item,()=>entry.previous===key)) {
        const image = new Image();
        // Render a single sheet pose without changing the original asset.
        image.onload = () => {
          if (entry.previous !== key) return;
          const crop = item.iconCrop || { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
          const angle = (item.iconRotation || 0) * Math.PI / 180;
          const boundWidth = Math.abs(crop.width * Math.cos(angle)) + Math.abs(crop.height * Math.sin(angle));
          const boundHeight = Math.abs(crop.width * Math.sin(angle)) + Math.abs(crop.height * Math.cos(angle));
          const scale = 120 / Math.max(boundWidth, boundHeight);
          iconContext.save();
          iconContext.translate(64, 64);
          iconContext.rotate(angle);
          iconContext.drawImage(image, crop.x, crop.y, crop.width, crop.height,
            -crop.width * scale / 2, -crop.height * scale / 2, crop.width * scale, crop.height * scale);
          iconContext.restore();
        };
        image.src = source;
      }
      entry.slot.setAttribute('aria-label', item?.level === undefined ? label : `${label}, ${levelLabel}`);
      entry.slot.title = label;
    }
    if (changed) updateCaptionRowSpacing(slots[0].container, slots);
  }

  /** Assign or clear a future selected item: { name, icon: 'path/to/icon.png' }. */
  function setSlot(type, index, item) {
    if (!activeCharacter || !['attack', 'equipment'].includes(type) ||
        !Number.isInteger(index) || index < 0 || index >= 6) return;
    const property = type === 'attack' ? 'attackSlots' : 'equipmentSlots';
    activeCharacter[property] ??= [];
    activeCharacter[property][index] = item || null;
    updateSlots(type === 'attack' ? attackSlots : equipmentSlots, activeCharacter[property]);
  }

  // Dedicated HUD profiles override sprite-sheet crops for these characters.
  for (const [label, file] of [['Plana', 'plana.png'], ['Arona', 'arona.png']]) {
    const image = new Image();
    image.onload = () => {
      profiles.set(label, image);
      previousName = undefined; // Refresh the active portrait on the next render.
    };
    // Keep the existing sprite portrait available if a profile cannot be loaded.
    image.src = `../sprites/hud/${file}`;
  }

  /** Reflect existing character state; defaults stay full HP and zero EXP for tests. */
  function update(character) {
    creditsText.setText(String(getLootTotals().credits));
    killsText.setText(String(getKillCount()));
    const playerLevel = Math.max(1, Math.floor(Number(character.level) || 1));
    level.setText(`LV: ${playerLevel}`);
    const maximumHp = Math.max(1, character.maxHp ?? 100);
    const health = Math.max(0, Math.min(maximumHp, character.hp ?? maximumHp));
    hpNumbers.setText(`${Math.ceil(health)}/${maximumHp}`);
    const maximumExp = Math.max(1, character.maxExp ?? 100);
    const experience = Math.max(0, Math.min(maximumExp, character.exp ?? 0));
    hp.setAttribute('aria-valuemax', String(maximumHp));
    hp.setAttribute('aria-valuenow', String(health));
    hp.setAttribute('aria-valuetext', `${health} / ${maximumHp} HP`);
    exp.setAttribute('aria-valuemax', String(maximumExp));
    exp.setAttribute('aria-valuenow', String(experience));
    exp.setAttribute('aria-valuetext', `${experience} / ${maximumExp} EXP`);
    // HP artwork is 643px wide; actual fill occupies source columns 72..628.
    // Map health to that interior so labels/end framing do not distort progress.
    const hpRightInset = health === 0 ? 100 : health === maximumHp ? 0
      : (643 - (72 + 557 * health / maximumHp)) / 643 * 100;
    hpFill.style.clipPath = `inset(0 ${hpRightInset}% 0 0)`;
    const shield = Math.max(0, Math.min(maximumHp, character.shield || 0));
    shieldFill.hidden = shield === 0;
    const shieldRightInset = (643 - (72 + 557 * shield / maximumHp)) / 643 * 100;
    shieldFill.style.clipPath = `inset(0 ${shieldRightInset}% 0 0)`;
    // Match the animated fill boundary, using the shield artwork's interior columns.
    shieldEdge.style.left = `${100 - shieldRightInset}%`;
    shieldEdge.hidden = shield === 0;
    hp.setAttribute('aria-valuetext', `${health} / ${maximumHp} HP; ${shield} shield`);
    const percent = experience / maximumExp * 100;
    // Caps use their own filled artwork; only the middle is proportionally clipped.
    expFill.style.setProperty('--exp-unfilled', `${100 - percent}%`);
    expFill.dataset.hasExp = String(experience > 0);
    expFill.dataset.full = String(experience === maximumExp);
    // The middle starts after the 90px left cap and ends before the 15px right cap.
    expEdge.style.left = `calc(${percent}% + ${90 - 105 * percent / 100}px)`;
    expEdge.hidden = experience === 0;
    activeCharacter = character;
    updateSlots(attackSlots, character.attackSlots);
    updateSlots(equipmentSlots, character.equipmentSlots);
    if (previousImage === character.image && previousName === character.label) return;
    previousImage = character.image;
    previousName = character.label;
    portrait.setAttribute('aria-label', `${character.label} portrait`);
    context.clearRect(0, 0, portrait.width, portrait.height);
    const profile = profiles.get(character.label);
    if (profile) {
      // Preserve the entire profile and its proportions, with crisp pixel artwork.
      context.imageSmoothingEnabled = false;
      const scale = Math.min(portrait.width / profile.naturalWidth, portrait.height / profile.naturalHeight);
      const width = profile.naturalWidth * scale;
      const height = profile.naturalHeight * scale;
      context.drawImage(profile, (portrait.width - width) / 2, (portrait.height - height) / 2, width, height);
      return;
    }
    context.imageSmoothingEnabled = true;
    const image = character.animationFrames?.[0].image || character.image;
    const pose = { ...character, direction: character.defaultDirection || 'down', moving: false, attack: null };
    const crop = character.animationFrames
      ? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight }
      : getFrameRectangle(pose, 0);
    // Focus on the upper body/face; use the source sheet without editing the asset.
    const side = Math.min(crop.width, crop.height * 0.65);
    context.drawImage(image, crop.x + (crop.width - side) / 2, crop.y,
      side, side, 0, 0, portrait.width, portrait.height);
  }
  return { update, setSlot };
}
