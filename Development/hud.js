import { createBitmapText } from './bitmap-font.js';

/** Arrange HUD values/portrait without introducing combat or experience mechanics. */
export function createHud(getFrameRectangle) {
  const exp = document.querySelector('#hud-exp');
  const expFill = document.querySelector('#hud-exp-fill');
  const expEdge = document.querySelector('#hud-exp-edge');
  const hp = document.querySelector('#hud-hp');
  const hpFill = document.querySelector('#hud-hp-fill');
  const portrait = document.querySelector('#hud-portrait');
  const level = createBitmapText(document.querySelector('#hud-level'));
  const context = portrait.getContext('2d');
  let previousImage;
  let previousName;
  const profiles = new Map();
  let activeCharacter;

  /** Create six compact slots per row once, then update only changed artwork. */
  function createSlots(container, type) {
    return Array.from({ length: 6 }, (_, index) => {
      const slot = document.createElement('div');
      slot.className = 'hud-slot';
      slot.setAttribute('role', 'img');
      const base = document.createElement('img');
      base.alt = '';
      const icon = document.createElement('img');
      icon.className = 'hud-slot-icon';
      icon.alt = '';
      icon.hidden = true;
      slot.append(base, icon);
      container.append(slot);
      return { slot, base, icon, type, index, previous: null };
    });
  }
  const attackSlots = createSlots(document.querySelector('#hud-attack-slots'), 'attack');
  const equipmentSlots = createSlots(document.querySelector('#hud-equipment-slots'), 'equipment');

  /** Occupied slots use a blank base so placeholder swords/clothes never show through. */
  function updateSlots(slots, items = []) {
    for (const entry of slots) {
      const item = items[entry.index];
      const source = item?.icon || '';
      const label = source ? item.name || `${entry.type} ${entry.index + 1}`
        : `Empty ${entry.type} slot ${entry.index + 1}`;
      const key = `${source}|${label}`;
      if (entry.previous === key) continue;
      entry.previous = key;
      entry.base.src = `../sprites/hud/${source ? 'empty' : entry.type}-slot.png`;
      entry.icon.hidden = !source;
      if (source) entry.icon.src = source;
      else entry.icon.removeAttribute('src');
      entry.slot.setAttribute('aria-label', label);
      entry.slot.title = label;
    }
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
    const playerLevel = Math.max(1, Math.floor(Number(character.level) || 1));
    level.setText(`LV: ${playerLevel}`);
    const maximumHp = Math.max(1, character.maxHp ?? 100);
    const health = Math.max(0, Math.min(maximumHp, character.hp ?? maximumHp));
    const maximumExp = Math.max(1, character.maxExp ?? 100);
    const experience = Math.max(0, Math.min(maximumExp, character.exp ?? 0));
    hp.setAttribute('aria-valuemax', String(maximumHp));
    hp.setAttribute('aria-valuenow', String(health));
    exp.setAttribute('aria-valuemax', String(maximumExp));
    exp.setAttribute('aria-valuenow', String(experience));
    exp.setAttribute('aria-valuetext', `${experience} / ${maximumExp} EXP`);
    hpFill.style.clipPath = `inset(0 ${100 - health / maximumHp * 100}% 0 0)`;
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
