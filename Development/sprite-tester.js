// Row input order used by the test controls; indices are zero-based.
const directions = ['down', 'downLeft', 'left', 'upLeft', 'up', 'upRight', 'right', 'downRight'];

/** Build a configurable-column/eight-row grid within editable source-image margins. */
export function makeGrid(width, height, margins, columns = 5) {
  if (!Number.isInteger(columns) || columns < 1 || columns > 64) {
    throw new Error('Columns must be an integer from 1 to 64.');
  }
  const { left, top, right, bottom } = margins;
  if (Object.values(margins).some(value => !Number.isFinite(value) || value < 0) ||
      left + right >= width || top + bottom >= height) {
    throw new Error('Margins must leave a non-empty sprite area.');
  }
  const columnEdges = Array.from({ length: columns + 1 }, (_, i) => left + (width - left - right) * i / columns);
  const edges = Array.from({ length: 9 }, (_, i) => top + (height - top - bottom) * i / 8);
  return { columnEdges, rowEdges: Array.from({ length: columns }, () => [...edges]) };
}

/** Decode a local image before replacing the currently working sprite. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Cannot read this image. Choose a PNG, WebP, or JPEG sprite sheet.'));
    image.src = url;
  });
}

/** Install session-only sprite swapping; built-in assets and crop settings stay intact. */
export function setupSpriteTester(characters, switchCharacter) {
  const form = document.querySelector('#sprite-tester');
  const target = form.elements.namedItem('target');
  const feedback = document.querySelector('#sprite-feedback');
  const originals = new Map(Object.entries(characters).map(([name, character]) =>
    [name, { ...character }]
  ));
  const localUrls = new Map();

  /** Populate editable row/mirror controls from the chosen avatar's current setup. */
  function showSettings() {
    const character = characters[target.value];
    form.elements.namedItem('rows').value = directions.map(direction => character.rows[direction]).join(',');
    form.elements.namedItem('mirrors').value = (character.mirroredDirections || []).join(',');
    form.elements.namedItem('reference').value = character.referenceSize || 215;
    form.elements.namedItem('columns').value = character.layout.columnEdges.length - 1;
  }

  target.addEventListener('change', showSettings);
  showSettings();

  // Decode first, then atomically apply; failed uploads leave the old sheet usable.
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = target.value;
    const apply = form.querySelector('[type="submit"]');
    let url;
    apply.disabled = true;
    feedback.textContent = 'Loading sprite settings…';
    try {
      const rows = form.elements.namedItem('rows').value.split(',').map(value => Number(value.trim()));
      if (rows.length !== 8 || rows.some(row => !Number.isInteger(row) || row < 0 || row > 7)) {
        throw new Error('Enter eight row indices between 0 and 7.');
      }
      const mirrors = form.elements.namedItem('mirrors').value.split(',').map(value => value.trim()).filter(Boolean);
      if (mirrors.some(direction => !directions.includes(direction))) throw new Error('Unknown mirrored direction.');
      const file = form.elements.namedItem('sheet').files[0];
      if (file) url = URL.createObjectURL(file);
      const image = url ? await loadImage(url) : characters[name].image;
      const margins = Object.fromEntries(['left', 'top', 'right', 'bottom'].map(edge =>
        [edge, Number(form.elements.namedItem(edge).value)]
      ));
      const layout = form.elements.namedItem('layout').value === 'grid'
        ? makeGrid(image.naturalWidth, image.naturalHeight, margins, Number(form.elements.namedItem('columns').value))
        : originals.get(name).layout;
      if (layout.columnEdges.at(-1) > image.naturalWidth ||
          layout.rowEdges.some(edges => edges.at(-1) > image.naturalHeight)) {
        throw new Error('Built-in crops exceed this image. Choose the regular grid layout.');
      }
      const referenceSize = Number(form.elements.namedItem('reference').value);
      if (!Number.isFinite(referenceSize) || referenceSize <= 0) throw new Error('Display reference size must be positive.');
      Object.assign(characters[name], {
        image, layout, rows: Object.fromEntries(directions.map((direction, i) => [direction, rows[i]])),
        mirroredDirections: mirrors, idleRows: {}, referenceSize,
        walkFrames: Object.fromEntries(directions.map(direction => [direction, Array.from({ length: layout.columnEdges.length - 1 }, (_, i) => i)])),
        elapsed: 0, moving: false
      });
      if (url) {
        if (localUrls.has(name)) URL.revokeObjectURL(localUrls.get(name));
        localUrls.set(name, url);
        url = undefined;
      }
      switchCharacter(name);
      feedback.textContent = `${characters[name].label}: test sheet applied (${image.naturalWidth} × ${image.naturalHeight}).`;
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      if (url) URL.revokeObjectURL(url);
      apply.disabled = false;
    }
  });

  /** Restore the selected avatar's built-in sheet without moving the player. */
  document.querySelector('#restore-sprite').addEventListener('click', () => {
    const name = target.value;
    const { x, y, direction } = characters[name];
    Object.assign(characters[name], originals.get(name), { x, y, direction, moving: false, elapsed: 0 });
    if (localUrls.has(name)) URL.revokeObjectURL(localUrls.get(name));
    localUrls.delete(name);
    form.elements.namedItem('sheet').value = '';
    showSettings();
    feedback.textContent = `${characters[name].label}: built-in sprite restored.`;
  });

  window.addEventListener('pagehide', () => {
    for (const url of localUrls.values()) URL.revokeObjectURL(url);
  });
}
