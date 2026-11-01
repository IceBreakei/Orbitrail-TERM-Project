/** HoloCure EXP curve: 79 to reach level 2, then differences of power totals. */
export function experienceForLevel(level) {
  const current = Math.max(1, Math.floor(level));
  if (current === 1) return 79;
  return Math.round((4 * (current + 1)) ** 2.1) - Math.round((4 * current) ** 2.1);
}

/** Initialize session stats once; Development defaults to invincibility on. */
export function ensurePlayerStats(character) {
  character.level ??= 1;
  character.exp ??= 0;
  character.maxExp = experienceForLevel(character.level);
  character.maxHp ??= 100;
  character.hp ??= character.maxHp;
  character.invincible ??= true;
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
    character.maxExp = experienceForLevel(character.level);
  }
}

/** Death protection allows zero HP; use this check when handling player defeat. */
export function isPlayerDefeated(character) {
  ensurePlayerStats(character);
  return character.hp <= 0 && !character.invincible;
}

/** Apply damage and its flash even while invincible, preserving HP bounds. */
export function damagePlayer(character, amount) {
  ensurePlayerStats(character);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const previous = character.hp;
  character.hp = Math.max(0, character.hp - Math.floor(amount));
  if (character.hp < previous) character.damageFlashElapsed = 0;
  return character.hp < previous;
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
  const invincibility = document.querySelector('#player-invincibility');
  const status = document.querySelector('#player-stats-status');
  const feedback = document.querySelector('#player-stats-feedback');

  /** Keep toggles and inspection values synchronized across character swaps. */
  function update() {
    const character = ensurePlayerStats(getPlayer());
    invincibility.checked = character.invincible;
    status.textContent = `${character.label} | LV ${character.level} | EXP ${character.exp}/${character.maxExp} | HP ${character.hp}/${character.maxHp}`;
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
      const amount = Number(action === 'exp' ? expAmount.value : hpAmount.value);
      if (['exp', 'damage', 'heal'].includes(action) &&
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
      if (action === 'heal') healPlayer(character, amount);
      if (action === 'full-heal') healPlayer(character, character.maxHp);
      if (action === 'reset') {
        Object.assign(character, { level: 1, exp: 0, hp: character.maxHp, invincible: true });
        delete character.damageFlashElapsed;
        ensurePlayerStats(character);
      }
      update();
      onChange(character);
    });
  });
  update();
  return { update };
}
