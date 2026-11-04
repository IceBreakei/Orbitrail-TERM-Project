import { skillCastSettings } from './game-config.js';

/** List equipped weapon skills and an optional future ultimate, each with its own timer. */
export function equippedSkills(character) {
  return [...(character.attackSlots || []), character.ultimateSkill].filter(skill => skill?.icon && skill.exSkill !== false);
}

/** Find availability only; this does not select or equip a weapon. */
export function readySkill(character) {
  return equippedSkills(character).find(skill => !(skill.skillCooldownRemaining > 0));
}

/** Put a cooldown on the exact weapon that initiated a cast, independently of other weapons. */
export function setSkillCooldown(weapon, seconds) {
  weapon.skillCooldownDuration = seconds;
  weapon.skillCooldownRemaining = seconds;
}

/** Tick each equipped weapon once; global pause freezes these timers in the game loop. */
export function advanceSkillCooldowns(characters, delta) {
  const visited = new Set();
  for (const character of characters) for (const weapon of equippedSkills(character)) {
    if (!weapon || visited.has(weapon)) continue;
    visited.add(weapon);
    weapon.skillCooldownRemaining = Math.max(0, (weapon.skillCooldownRemaining || 0) - Math.max(0, delta));
  }
}

/** Drawing-cast state machine; async recognition responses must match the current token. */
export function createSkillCastState(onSubmit = () => {}) {
  let phase = 'idle', owner = null, weapon = null;
  let elapsed = 0, idle = 0, drawing = false, inkLength = 0, token = 0;
  return {
    get phase() { return phase; }, get owner() { return owner; }, get weapon() { return weapon; },
    get token() { return token; }, get inkLength() { return inkLength; },
    get remaining() { return Math.max(0, skillCastSettings.drawingSeconds - elapsed); },
    begin(character, item, adminTest = false) {
      if (phase !== 'idle' || !item?.icon || (!adminTest && item.skillCooldownRemaining > 0)) return false;
      owner = character; weapon = item; elapsed = idle = inkLength = 0; drawing = false;
      phase = 'drawing'; token++;
      return true;
    },
    strokeStart() { if (phase === 'drawing') { drawing = true; idle = 0; } },
    addInk(length) { if (phase === 'drawing') { inkLength += Math.max(0, length); idle = 0; } },
    strokeEnd() { drawing = false; idle = 0; },
    update(delta) {
      if (phase !== 'drawing') return;
      const time = Math.max(0, delta);
      elapsed += time;
      if (!drawing && inkLength > 0) idle += time;
      if (elapsed >= skillCastSettings.drawingSeconds || idle >= skillCastSettings.idleSubmitSeconds) {
        if (inkLength <= skillCastSettings.minimumInkLength) { this.cancel('empty'); return; }
        phase = 'recognizing'; drawing = false;
        onSubmit({ token, owner, weapon });
      }
    },
    cancel(reason, target = weapon) {
      if (phase === 'idle') return false;
      const penalty = reason === 'pause' ? skillCastSettings.pauseCancelCooldown
        : reason === 'right' ? skillCastSettings.rightCancelCooldown
        : reason === 'empty' ? skillCastSettings.failureCooldown : 0;
      if (penalty && inkLength > 0 && target && equippedSkills(owner).includes(target) &&
          !(target.skillCooldownRemaining > 0)) setSkillCooldown(target, penalty);
      token++; phase = 'idle'; drawing = false;
      return true;
    },
    resolve(requestToken, result) {
      if (requestToken !== token || phase !== 'recognizing') return false;
      let valid = Boolean(result && result.valid !== false && typeof result.label === 'string' && result.label.length > 0 &&
        Number.isFinite(result.score) && result.score >= skillCastSettings.minimumConfidence);
      if (valid && result.weapon) {
        if (!equippedSkills(owner).includes(result.weapon) || (!result.adminTest && result.weapon.skillCooldownRemaining > 0)) valid = false;
        else weapon = result.weapon;
      }
      // Unknown/ambiguous/failed recognition is free; never penalize a guessed weapon.
      if (valid) setSkillCooldown(weapon, skillCastSettings.successCooldown);
      if (valid) {
        weapon.lastSkillDrawing = { label: result.label, score: result.score, skillId: result.skillId, components: result.components,
          accuracy: result.accuracy, damageMultiplier: result.damageMultiplier, clipPredictions: result.clipPredictions };
      }
      phase = 'idle'; token++;
      return Boolean(valid);
    }
  };
}
