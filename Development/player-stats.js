import { chiseDelayConfigured } from './game-config.js';
import { syncRacerPassHealth, syncLifeJacketShield, lifeJacketStats, totalPlayerShield, chiseImmediateFraction } from './item-catalog.js';
import { developmentSettings, damageReductionFormula } from './game-config.js';
import { levelExpFormula } from './game-config.js';
import { startingLevelExp, expIncreasePerLevel } from './game-config.js';
export { startingLevelExp, expIncreasePerLevel } from './game-config.js';
import { showDamageNumber } from './damage-numbers.js';
import { ensureCombatStats, defaultCombatStats } from './combat-stats.js';

// Level costs and formulas live in game-config.js.



/** Add round(15 + currentLevel / 2) to the next requirement on each level-up. */
export function experienceForLevel(level) {
  return levelExpFormula(level);
}

/** Initialize session stats once; Development defaults to invincibility on. */
export function ensurePlayerStats(character) {
  character.level ??= 1;
  character.pendingUpgrades ??= 0;
  character.exp ??= 0;
  character.maxExp = experienceForLevel(character.level);
  character.maxHp ??= 100;
  character.hp ??= character.maxHp;
  syncRacerPassHealth(character);
  syncLifeJacketShield(character);
  character.shield = Math.max(0, Math.min(character.maxHp, character.shield ?? 0));
  character.invincible ??= developmentSettings.invincible;
  ensureCombatStats(character);
  return character;
}

/** Add experience, retaining overflow and supporting multiple level-ups per award. */
export function addPlayerExp(character, amount) {
  ensurePlayerStats(character);
  if (!Number.isFinite(amount) || amount <= 0) return;
  character.exp += Math.min(1000000, Math.floor(amount));
  while (character.exp >= character.maxExp) {
    character.exp -= character.maxExp;
    character.level++;
    character.pendingUpgrades++; // Each gained level gets its own choice, including overflow.
    character.maxExp = experienceForLevel(character.level);
    character.hp = character.maxHp; // Every level-up fully restores health.
  }
}

/** Death protection allows zero HP; use this check when handling player defeat. */
export function isPlayerDefeated(character) {
  ensurePlayerStats(character);
  return character.hp <= 0 && !character.invincible;
}

/** Add or remove shield points, capped by max HP without changing health. */
export function changePlayerShield(character, amount) {
  ensurePlayerStats(character);
  if (Number.isFinite(amount)) {
    character.shield = Math.max(0, Math.min(character.maxHp, character.shield + Math.trunc(amount)));
  }
}

// The runtime item effect registers once; plain stat consumers need no world dependencies.
let playerDamageGuard=null;
export function setPlayerDamageGuard(guard){playerDamageGuard=guard;}
/** Absorb damage with shield first; spill excess into HP and show one hit number. */
export function damagePlayer(character, amount) {
  ensurePlayerStats(character);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const damage = Math.round(amount * damageReductionFormula([].concat(character.damageReductionPercent??[],lifeJacketStats(character)?.reduction??0)));
  if(damage<=0)return false;
  if(playerDamageGuard?.(character,damage)){character.lastDamageResult={negated:true,healthDamage:0,shieldDamage:0};showDamageNumber(character,0,true,'miss');return false;}
  const initialFraction=chiseDelayConfigured()?chiseImmediateFraction(character):1;
  const immediate=Math.round(damage*initialFraction),deferred=damage-immediate;
  if(deferred>0){
    if(!(character.chisePendingDamage>0))character.chiseTickElapsed=0;
    character.chisePendingDamage=(character.chisePendingDamage||0)+deferred;
  }
  const taken=applyResolvedPlayerDamage(character,immediate);
  character.lastDamageResult.deferredDamage=deferred;
  return taken||deferred>0;
}

/** Already-resolved damage bypasses attack-only negation, DR and Chise re-deferral. */
export function applyResolvedPlayerDamage(character,damage){
  ensurePlayerStats(character);
  if(!Number.isFinite(damage)||damage<=0){character.lastDamageResult={negated:false,healthDamage:0,shieldDamage:0};return false;}
  const jacket=character.lifeJacketState;
  const jacketAbsorbed=Math.min(jacket?.remaining??0,damage);
  if(jacket){jacket.remaining-=jacketAbsorbed;if(jacket.remaining<jacket.capacity)jacket.healElapsed=0;}
  const absorbed = Math.min(character.shield, damage-jacketAbsorbed);
  character.shield -= absorbed;
  const previous = character.hp;
  character.hp = Math.max(0, character.hp - (damage - jacketAbsorbed - absorbed));
  const healthDamage=previous-character.hp;
  const taken = jacketAbsorbed + absorbed + healthDamage;
  character.lastDamageResult={negated:false,healthDamage,shieldDamage:jacketAbsorbed+absorbed};
  if (taken > 0) {
    if(healthDamage>0)character.damageFlashElapsed = 0;
    const shieldDamage=jacketAbsorbed+absorbed;
    if(shieldDamage>0)showDamageNumber(character,shieldDamage,true,'shield');
    if(healthDamage>0)showDamageNumber(character,healthDamage,true);
  }
  return taken > 0;
}

/** Heal without exceeding maximum HP; works while invincible. */
export function healPlayer(character, amount) {
  ensurePlayerStats(character);
  if (Number.isFinite(amount) && amount > 0) {
    character.hp = Math.min(character.maxHp, character.hp + Math.floor(amount));
  }
}

/** Wire admin progression/HP controls to the currently controlled character. */
export function createPlayerStatsTools(getPlayer, onChange) {
  const panel = document.querySelector('#player-stats-tools');
  const expAmount = panel.querySelector('[name="exp-amount"]');
  const hpAmount = panel.querySelector('[name="hp-amount"]');
  const shieldAmount = panel.querySelector('[name="shield-amount"]');
  const invincibility = document.querySelector('#player-invincibility');
  const status = document.querySelector('#player-stats-status');
  const feedback = document.querySelector('#player-stats-feedback');
  const statInputs = [...panel.querySelectorAll('[data-combat-stat]')];
  let inspectedCharacter;

  // Apply on change so typing is not interrupted by per-frame HUD refreshes.
  for (const input of statInputs) {
    input.addEventListener('change', () => {
      const value = Number(input.value);
      const maximum = input.dataset.combatStat === 'critPercent' ? 100 : 1000;
      const stats = ensureCombatStats(getPlayer());
      if (Number.isFinite(value)) stats[input.dataset.combatStat] = Math.max(0, Math.min(maximum, value));
      input.value = stats[input.dataset.combatStat];
      onChange(getPlayer());
    });
  }

  /** Keep toggles and inspection values synchronized across character swaps. */
  function update() {
    const character = ensurePlayerStats(getPlayer());
    invincibility.checked = character.invincible;
    for (const input of statInputs) {
      if (inspectedCharacter !== character || document.activeElement !== input) input.value = character.combatStats[input.dataset.combatStat];
    }
    inspectedCharacter = character;
    status.textContent = `${character.label} | LV ${character.level} | EXP ${character.exp}/${character.maxExp} | HP ${character.hp}/${character.maxHp} | Shield ${totalPlayerShield(character)}/${character.maxHp}`;
  }
  invincibility.addEventListener('change', () => {
    getPlayer().invincible = invincibility.checked;
    feedback.textContent = invincibility.checked ? 'Death protection enabled; HP can still reach zero.' : 'Death protection disabled.';
    update();
  });
  panel.querySelectorAll('[data-player-stat]').forEach(button => {
    button.addEventListener('click', () => {
      const character = ensurePlayerStats(getPlayer());
      const action = button.dataset.playerStat;
      const amount = Number(action === 'exp' ? expAmount.value : action.startsWith('shield-') ? shieldAmount.value : hpAmount.value);
      if (['exp', 'damage', 'heal', 'shield-add', 'shield-remove'].includes(action) &&
          (!Number.isFinite(amount) || amount < 1 || amount > 1000000)) {
        feedback.textContent = 'Enter an amount from 1 to 1,000,000.';
        return;
      }
      feedback.textContent = '';
      if (action === 'exp') addPlayerExp(character, amount);
      if (action === 'level') addPlayerExp(character, character.maxExp - character.exp);
      if (action === 'damage' && !damagePlayer(character, amount)) {
        feedback.textContent = 'HP is already zero.';
      }
      if (action === 'shield-add') changePlayerShield(character, amount);
      if (action === 'shield-remove') changePlayerShield(character, -amount);
      if (action === 'shield-clear') character.shield = 0;
      if (action === 'heal') healPlayer(character, amount);
      if (action === 'full-heal') healPlayer(character, character.maxHp);
      if (action === 'preview-crit') showDamageNumber(character, 23, false, 'critical');
      if (action === 'preview-supercrit') showDamageNumber(character, 23, false, 'supercritical');
      if (action === 'reset') {
        Object.assign(character, { level: 1, exp: 0, pendingUpgrades: 0, hp: character.maxHp, shield: 0, invincible: developmentSettings.invincible });
        character.combatStats = {}; // Reinitialize character defaults, including base CRT.
        delete character.damageFlashElapsed;
        delete character.chisePendingDamage;delete character.chiseTickElapsed;
        ensurePlayerStats(character);
      }
      update();
      onChange(character);
    });
  });
  update();
  return { update };
}
