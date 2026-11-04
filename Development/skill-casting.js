import { recognizeAdminDigit, adminSkillResult } from './admin-skills.js';
import { recognizeLoadoutPattern, closestDrawingSkill } from './skill-pattern-recognition.js';
import { skillCastSettings } from './game-config.js';
import { createSkillCastState, advanceSkillCooldowns, readySkill, equippedSkills, setSkillCooldown } from './skill-cast-state.js';
import { createDrawingRecognizer } from './drawing-recognizer.js';
import { drawSkillStrokes } from './skill-drawing.js';
import { pointerToCanvas } from './aiming.js';

/** Connect right-click casting, sketch input, recognition and per-weapon cooldowns. */
export function createSkillCasting({ canvas, aiming, getPlayer, getCharacters, isPaused,
  recognizer = createDrawingRecognizer(), getCastAngle = () => 0, onRecognized = () => {} }) {
  const overlay = document.querySelector('#skill-cast-overlay');
  const drawingCanvas = document.querySelector('#skill-drawing-canvas');
  const context = drawingCanvas.getContext('2d');
  const timer = document.querySelector('#skill-cast-timer');
  const bar = document.querySelector('#skill-cast-bar');
  const fill = document.querySelector('#skill-cast-fill');
  const status = document.querySelector('#skill-cast-status');
  const feedback = document.querySelector('#skill-feedback');
  let feedbackTimeout;

  /** Surface recognition/cancellation feedback without requiring the admin panel to be open. */
  function setStatus(text) {
    status.textContent = text;
    if (!feedback) return;
    feedback.textContent = text; feedback.hidden = false;
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => { feedback.hidden = true; }, 6000);
  }
  let strokes = [], activeStroke = null, pointerId = null;
  let adminNumbersForCast = false;
  const numberMode = () => Boolean(document.querySelector('#admin-number-casting')?.checked);
  let penCursor = 'crosshair';
  const penImage = new Image();
  penImage.onload = () => {
    // Native cursor artwork must be small; align its hotspot with the pen tip.
    const cursorCanvas = document.createElement('canvas');
    cursorCanvas.width = 48;
    cursorCanvas.height = Math.round(48 * penImage.naturalHeight / penImage.naturalWidth);
    cursorCanvas.getContext('2d').drawImage(penImage, 0, 0, cursorCanvas.width, cursorCanvas.height);
    penCursor = `url("${cursorCanvas.toDataURL('image/png')}") 20 36, crosshair`;
    if (!overlay.hidden) drawingCanvas.style.cursor = penCursor;
  };
  penImage.src = new URL('../sprites/pen.png', import.meta.url).href;

  const state = createSkillCastState(async request => {
    request.adminNumbers = adminNumbersForCast;
    const sketch = strokes.map(stroke => stroke.map(point => ({ ...point })));
    closeOverlay();
    setStatus('Checking drawing...');
    try {
      const digit = request.adminNumbers ? recognizeAdminDigit(sketch) : null;
      const result = request.adminNumbers
        ? digit ? adminSkillResult(request.owner, digit - 1) : { valid: false, reason: 'Draw a number from 1 to 6.' }
        : await recognizeLoadoutPattern(sketch, equippedSkills(request.owner), recognizer,
          () => request.token === state.token);
      if (request.token !== state.token) return;
      const accepted = state.resolve(request.token, result);
      if (accepted) {
        // Read restored targeting after recognition, rather than stale drawing-mode facing.
        const angle = getCastAngle();
        setStatus(`${result.label}! Accuracy: ${Math.round(result.accuracy * 100)}% | ${result.damageMultiplier.toFixed(2)}x damage. Cooldown: 3:00.`);
        onRecognized({ player: request.owner, weapon: result.weapon, angle,
          skillId: result.skillId, accuracy: result.accuracy, damageMultiplier: result.damageMultiplier,
          clipPredictions: result.clipPredictions, predictions: [{ label: result.label, score: result.score }], components: result.components });
      } else setStatus(`${result.reason || 'Drawing not recognized.'} No cooldown applied.`);
    } catch (error) {
      if (request.token !== state.token) return;
      state.resolve(request.token, null);
      setStatus(`Recognition unavailable: ${error.message} No cooldown applied.`);
    }
  });

  /** Restore the previous cursor-aim preference and release the drawing pointer. */
  function closeOverlay() {
    overlay.hidden = true;
    aiming.setDirectionalOverride(false);
    if (pointerId !== null && drawingCanvas.hasPointerCapture?.(pointerId)) drawingCanvas.releasePointerCapture(pointerId);
    activeStroke = null; pointerId = null;
  }

  /** Empty cancellation is free; ink penalties target its closest ready skill instead of a default slot. */
  function cancel(reason) {
    const target = state.inkLength > 0 ? closestDrawingSkill(strokes, equippedSkills(state.owner)) : null;
    if (!state.cancel(reason, target)) return;
    closeOverlay();
    const applied = target?.skillCooldownRemaining > 0;
    setStatus(applied ? `${target.name || 'Skill'} cancelled: ${Math.ceil(target.skillCooldownRemaining)}s cooldown.`
      : 'Cast cancelled. No cooldown applied.');
  }

  /** Open the configured drawing window without freezing movement or enemies. */
  function toggleCast(event) {
    if (event.button !== 2) return;
    event.preventDefault(); event.stopPropagation();
    if (isPaused()) return;
    if (state.phase !== 'idle') { cancel('right'); return; }
    const player = getPlayer();
    adminNumbersForCast = numberMode();
    const weapon = adminNumbersForCast ? equippedSkills(player)[0] : readySkill(player);
    if (!weapon || !state.begin(player, weapon, adminNumbersForCast)) {
      const skills = equippedSkills(player);
      const remaining = Math.min(...skills.map(skill => skill.skillCooldownRemaining || 0));
      setStatus(skills.length
        ? `All skills are on cooldown. Next ready in ${Math.ceil(remaining)} seconds.` : 'Equip a weapon to draw a skill.');
      return;
    }
    strokes = []; activeStroke = null;
    drawingCanvas.width = canvas.width; drawingCanvas.height = canvas.height;
    context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    overlay.hidden = false; aiming.setDirectionalOverride(false);
    updateDrawingAim(event);
    setStatus(adminNumbersForCast ? 'Admin: draw 1-6 to cast that attack-slot skill.' : 'Draw any ready EX skill pattern.');
    const hint = document.querySelector('#skill-pattern-hint');
    if (hint) hint.textContent = adminNumbersForCast ? 'Admin: draw slot number 1-6 (bypasses cooldown)' : equippedSkills(player).filter(skill => !(skill.skillCooldownRemaining > 0)).length === 1 && weapon.id === 'plana-umbrella'
      ? 'Circle enclosing an arrow above an X' : 'Draw your weapon pattern';
    updateTimer();
    // Start the download early; recognition retries after a temporary loading error.
    if (!adminNumbersForCast) recognizer.warmup().catch(() => {});
  }

  /** Convert pointer positions to fixed canvas coordinates, including scaled previews. */
  function point(event) {
    const result = pointerToCanvas(event.clientX, event.clientY, drawingCanvas.getBoundingClientRect(),
      drawingCanvas.width, drawingCanvas.height);
    return { x: Math.max(0, Math.min(drawingCanvas.width, result.x)),
      y: Math.max(0, Math.min(drawingCanvas.height, result.y)) };
  }
  /** Preserve cursor aim between strokes; force facing only while ink is being drawn. */
  function updateDrawingAim(event) {
    aiming.trackPointer?.(event);
    const drawing = activeStroke !== null;
    aiming.setDirectionalOverride(drawing);
    drawingCanvas.style.cursor = penCursor;
  }
  drawingCanvas.addEventListener('pointerenter', updateDrawingAim);
  drawingCanvas.addEventListener('pointerleave', () => aiming.setPointerInside?.(false));
  drawingCanvas.addEventListener('pointerdown', event => {
    if (event.button === 2) { toggleCast(event); return; }
    if (event.button !== 0 || state.phase !== 'drawing' || pointerId !== null) return;
    event.preventDefault(); pointerId = event.pointerId;
    drawingCanvas.setPointerCapture(pointerId);
    activeStroke = [point(event)]; strokes.push(activeStroke); state.strokeStart();
    updateDrawingAim(event);
  });
  drawingCanvas.addEventListener('pointermove', event => {
    updateDrawingAim(event);
    if (event.pointerId !== pointerId || !activeStroke || state.phase !== 'drawing') return;
    const samples = event.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event]) {
      const next = point(sample), previous = activeStroke.at(-1);
      const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
      if (distance < 0.75) continue;
      activeStroke.push(next); state.addInk(distance);
    }
    drawSkillStrokes(context, strokes, drawingCanvas.width, drawingCanvas.height);
  });
  function finishStroke(event) {
    if (event.pointerId !== pointerId) return;
    if (activeStroke && state.phase === 'drawing') {
      const next = point(event), previous = activeStroke.at(-1);
      const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
      if (distance >= 0.75) { activeStroke.push(next); state.addInk(distance); }
      drawSkillStrokes(context, strokes, drawingCanvas.width, drawingCanvas.height);
    }
    if (drawingCanvas.hasPointerCapture(pointerId)) drawingCanvas.releasePointerCapture(pointerId);
    activeStroke = null; pointerId = null; state.strokeEnd();
    updateDrawingAim(event);
  }
  drawingCanvas.addEventListener('pointerup', finishStroke);
  drawingCanvas.addEventListener('pointercancel', finishStroke);
  overlay.addEventListener('pointerdown', event => { if (event.button === 2) toggleCast(event); });
  overlay.addEventListener('contextmenu', event => event.preventDefault());
  overlay.addEventListener('click', event => event.stopPropagation());
  canvas.addEventListener('pointerdown', toggleCast);

  /** Match the countdown text and mirrored EXP artwork to the remaining cast time. */
  function updateTimer() {
    const seconds = state.remaining;
    timer.textContent = `${seconds.toFixed(1)}s`;
    bar.setAttribute('aria-valuemax', String(skillCastSettings.drawingSeconds));
    const remainingPercent = seconds / skillCastSettings.drawingSeconds * 100;
    fill.style.clipPath = `inset(0 ${100 - remainingPercent}% 0 0)`;
    // Keep the white leading edge aligned with the shrinking fill each frame.
    bar.style.setProperty('--timer-fill', `${remainingPercent}%`);
    bar.classList.toggle('has-time', seconds > 0);
    bar.setAttribute('aria-valuenow', seconds.toFixed(1));
  }

  window.addEventListener('pagehide', () => { cancel('leave'); clearTimeout(feedbackTimeout); recognizer.dispose(); }, { once: true });
  return {
    cancel,
    /** Clear every character's independent skill timers, including a pending attempt. */
    resetCooldowns() {
      cancel('admin');
      for (const character of getCharacters()) for (const weapon of equippedSkills(character)) {
        weapon.skillCooldownRemaining = 0;
      }
      setStatus('Admin: all skill cooldowns reset.');
    },
    /** Trigger a defined slot directly for effect testing, bypassing its current cooldown. */
    castSlot(slot) {
      if (isPaused()) return;
      const result = adminSkillResult(getPlayer(), slot);
      if (!result.valid) { setStatus(result.reason); return; }
      cancel('admin');
      setSkillCooldown(result.weapon, skillCastSettings.successCooldown);
      onRecognized({ ...result, player: getPlayer(), angle: getCastAngle(), predictions: [] });
      setStatus(`Admin: cast slot ${slot + 1}.`);
    },
    get phase() { return state.phase; },
    update(delta) {
      advanceSkillCooldowns(getCharacters(), delta);
      if (state.phase !== 'idle' && (state.owner !== getPlayer() || !equippedSkills(getPlayer()).includes(state.weapon))) cancel('switch');
      if (state.phase === 'drawing' && (drawingCanvas.width !== canvas.width || drawingCanvas.height !== canvas.height)) cancel('resize');
      state.update(delta);
      if (state.phase === 'drawing') updateTimer();
      else if (!overlay.hidden) { closeOverlay(); if (state.phase === 'idle') setStatus('No drawing submitted. No cooldown applied.'); }
    }
  };
}
