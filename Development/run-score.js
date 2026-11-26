import { scoreFormula } from './game-config.js';

/** Count real defeats and snapshot scores without inventing leaderboard/results placement. */
export function createRunScore() {
  let counts = { enemyDefeated: 0, miniBossDefeated: 0, bossDefeated: 0 };
  let endlessDefeatRecorded = false;
  const results = [];let saveResults=()=>{};
  return {
    configurePersistence(saved=[],onChange=()=>{}){results.splice(0,results.length,...saved.slice(-100));saveResults=onChange;},
    recordDefeat(enemy) {
      counts.enemyDefeated++;
      if (enemy.miniBoss) counts.miniBossDefeated++;
      else if (enemy.boss || (enemy.boss !== false && ['iroha','shiroko'].includes(enemy.type))) counts.bossDefeated++;
    },
    complete({ character, elapsedSeconds, stage, endless = false, hardcore = false }) {
      if (endless && endlessDefeatRecorded) return null;
      if (endless) endlessDefeatRecorded = true;
      const result = Object.freeze({ ...scoreFormula({ ...counts, playerLevel: character.level || 1,
        elapsedSeconds, hardcore:hardcore||character.hardcore }), ...counts, character: character.label, stage,
        playerLevel: character.level || 1, mode: endless ? 'endless' : 'stage', elapsedSeconds });
      results.push(result);if(results.length>100)results.shift();saveResults([...results]);
      return result;
    },
    clearResults(){results.length=0;saveResults([]);},
    get results() { return [...results]; },
    get counts() { return {...counts}; }
  };
}
