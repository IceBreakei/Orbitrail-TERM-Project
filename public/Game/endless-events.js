import { createEndlessBuildup } from './endless-buildup.js';
import { endlessEventSettings, eliteChance, midoriSettings } from './game-config.js';

export const endlessEventRegistry = {
  eliteSurge: { name: 'Elite Surge', create: onComplete => createEndlessBuildup(onComplete) },
  midori: { name: 'Midori Invasion' }
};

/** Manage elite surges and their boss-or-Midori outcome; admin triggers bypass campaign timing. */
export function createEndlessEvents(onBossReady, random = Math.random, onMidoriStart = () => {}, onEventEnd = () => {}) {
  let event = null, definition = null, bossWasAlive = false;
  let midoriRemaining = 0, manual = false;
  let eventKey = null, eventSequence = 0;
  function endCurrent() {
    if (eventKey) onEventEnd(eventKey);
    eventKey = null;
  }

  /** Begin a Midori-only stream in place of requesting the boss wave. */
  function startMidori() {
    endCurrent();
    eventKey = `midori-${++eventSequence}`;
    midoriRemaining = midoriSettings.eventSeconds;
    definition = endlessEventRegistry.midori;
    onMidoriStart();
  }
  /** Resolve an elite army before choosing its replacement encounter. */
  function finishElites() {
    endCurrent();
    if (random() < endlessEventSettings.midoriAfterEliteChance) startMidori();
    else onBossReady();
  }
  function chooseEvent() {
    endCurrent();
    midoriRemaining = 0;
    const ids = endlessEventSettings.enabledEvents.filter(id => endlessEventRegistry[id]?.create);
    const id = ids[Math.floor(random() * ids.length)];
    definition = endlessEventRegistry[id] || null;
    event = definition ? definition.create(finishElites) : null;
    eventKey = definition ? `eliteSurge-${++eventSequence}` : null;
  }
  chooseEvent();
  return {
    get name() { return definition?.name || 'None'; },
    get phase() { return midoriRemaining > 0 ? 'midori' : event?.phase || 'normal'; },
    get seconds() { return midoriRemaining > 0 ? midoriSettings.eventSeconds - midoriRemaining : event?.seconds || 0; },
    get active() { return manual || midoriRemaining > 0; },
    get eliteChance() { return midoriRemaining > 0 ? 0 : event?.eliteChance ?? eliteChance; },
    get spawnEventKey() { return midoriRemaining > 0 || ['ramp', 'elites'].includes(event?.phase) ? eventKey : null; },
    get spawnType() { return midoriRemaining > 0 ? 'midori' : null; },
    get allowsBossWave() { return midoriRemaining <= 0 && (!event || event.phase === 'ready'); },
    spawnRate(normalRate) { return midoriRemaining > 0 ? normalRate : event ? event.spawnRate(normalRate) : normalRate; },
    /** Start either event immediately for testing without enabling endless progression. */
    trigger(id) {
      if (!['midori', 'eliteSurge'].includes(id)) return false;
      manual = true;
      if (id === 'midori') startMidori();
      else if (id === 'eliteSurge') {
        endCurrent();
        eventKey = `eliteSurge-${++eventSequence}`;
        midoriRemaining = 0;
        definition = endlessEventRegistry.eliteSurge;
        event = definition.create(finishElites);
        event.startElites();
      } else { manual = false; return false; }
      return true;
    },
    stop() { manual = false; chooseEvent(); },
    end() { manual = false; chooseEvent(); },
    update(delta, state) {
      if (bossWasAlive && !state.bossAlive) { manual = false; chooseEvent(); }
      bossWasAlive = state.bossAlive;
      if (midoriRemaining > 0) {
        if (state.bossAlive) { manual = false; chooseEvent(); return; }
        if (state.spawning && Number.isFinite(delta)) midoriRemaining -= Math.max(0, delta);
        if (midoriRemaining <= 0) { manual = false; chooseEvent(); }
        return;
      }
      event?.update(delta, { ...state, endless: state.endless || manual });
    }
  };
}
