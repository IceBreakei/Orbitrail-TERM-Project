// Persistent-in-session enemy state is separate from disposable background tiles.
// Future enemy spawning should register world coordinates here, never screen X/Y.
const enemies = new Map();

/** Add or update an enemy's state without tying its lifetime to camera visibility. */
export function rememberEnemy(id, state) {
  const enemy = { ...enemies.get(id), ...state, id };
  enemies.set(id, enemy);
  return enemy;
}

/** Read a remembered enemy even after its background tile has left the screen. */
export function getEnemy(id) {
  return enemies.get(id);
}

/** Return enemies near the viewport for future rendering; retain all other records. */
export function getVisibleEnemies(cameraX, viewportWidth, margin = 160) {
  return [...enemies.values()].filter(enemy =>
    enemy.x >= cameraX - margin &&
    enemy.x <= cameraX + viewportWidth + margin
  );
}

/** Remove an enemy deliberately, for example after a confirmed defeat. */
export function removeEnemy(id) {
  enemies.delete(id);
}
