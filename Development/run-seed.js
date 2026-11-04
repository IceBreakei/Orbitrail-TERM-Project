import { developmentSettings } from './game-config.js';
/** Mix local start time with random entropy so each new run gets a fresh seed. */
export function createRunSeed(time = new Date(), entropy) {
  if (entropy === undefined) {
    entropy = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
      : Math.floor(Math.random() * 4294967296);
  }
  const localTime = [time.getFullYear(), time.getMonth(), time.getDate(),
    time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds(),
    time.getTimezoneOffset(), entropy].join(':');
  let hash = 2166136261;
  for (const character of localTime) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash ^ (hash >>> 16)) >>> 0;
}

// Generated once per page/game start; map changes and scene resets reuse it.
export const runStartedAt = new Date();
/** Development starts in admin seed 0; the reroll control opts into a random run. */
export function selectRunSeed(search = '', time = runStartedAt, entropy) {
  const requested = new URLSearchParams(search).get('seed');
  return (requested === null && developmentSettings.adminSeedByDefault) || requested === '0' ? 0 : (createRunSeed(time, entropy) || 1);
}
export const runSeed = selectRunSeed(globalThis.location?.search || '');

// Admin seed bundles tile previews and the 1-HP enemy test configuration.
export const isAdminSeed = runSeed === 0;
