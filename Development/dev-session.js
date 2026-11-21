// Settings survive an identified development-server reload, never an ordinary refresh.
(() => {
  const key = `orbitrail:dev-settings:${location.pathname}`;
  const marker = `${key}:code-reload`;
  const read = name => { try { return JSON.parse(sessionStorage.getItem(name)); } catch { return null; } };
  const write = (name, value) => { try { sessionStorage.setItem(name, JSON.stringify(value)); } catch {} };
  const remove = name => { try { sessionStorage.removeItem(name); } catch {} };
  const signal = read(marker);
  const saved = signal && Date.now() - signal < 15000 ? read(key) : null;
  remove(marker);
  if (!saved) remove(key);
  const selector = '.test-toolbar input, .test-toolbar select, .admin-panel input, .admin-panel select, #admin-clock-form input';
  const controls = () => [...document.querySelectorAll(selector)].filter(el => !el.disabled && !['file','password'].includes(el.type) && el.name !== 'npc-selection');
  const identity = el => el.id ? `id:${el.id}` : `name:${el.name}`;
  const buttons = () => [...document.querySelectorAll('[data-character], #toggle-bounds, #toggle-arrow, #music-soundtrack-toggle, #music-toggle, #toggle-random-spawning')];
  const buttonKey = el => el.id || `character:${el.dataset.character}`;
  function snapshot() {
    return {
      statDefaultsVersion: 1,
      controls: Object.fromEntries(controls().map(el => [identity(el), {value:el.value, checked:el.checked}])),
      buttons: Object.fromEntries(buttons().map(el => [buttonKey(el), el.getAttribute('aria-pressed')])),
      panels: [...document.querySelectorAll('details.admin-panel, #npc-tools, #player-stats-panel')].map(el => ({id:el.id, index:[...document.querySelectorAll('details')].indexOf(el), open:el.open})),
      adminOpen: !document.querySelector('#admin-panel')?.hidden
    };
  }
  // Register before Live Server's handler, so the snapshot is written before reload().
  const NativeSocket = window.WebSocket;
  if (NativeSocket) window.WebSocket = class extends NativeSocket {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        let message; try { message = JSON.parse(event.data); } catch {}
        if (event.data === 'reload' || message?.type === 'full-reload') {
          write(key, snapshot()); write(marker, Date.now());
        }
      });
    }
  };
  let restoring = false;
  for (const event of ['input','change','click','toggle']) document.addEventListener(event, () => {
    if (!restoring) write(key, snapshot());
  }, true);
  window.restoreDevSession = () => {
    if (!saved) return;
    restoring = true;
    try {
      // Select the avatar first, then apply settings through their existing handlers.
      for (const el of buttons()) {
        const target = saved.buttons?.[buttonKey(el)];
        if (target != null && target !== el.getAttribute('aria-pressed') && (!el.dataset.character || target === 'true')) el.click();
      }
      for (const el of controls()) {
        const state = saved.controls?.[identity(el)];
        if (!state) continue;
        // Older snapshots stored the former generic zero CRT, before character defaults.
        if(!saved.statDefaultsVersion&&el.dataset?.combatStat==='critPercent')continue;
        if (el.tagName === 'SELECT' && ![...el.options].some(option => option.value === state.value)) continue;
        el.value = state.value;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = state.checked;
        el.dispatchEvent(new Event('input', {bubbles:true}));
        el.dispatchEvent(new Event('change', {bubbles:true}));
      }
      for (const panel of saved.panels || []) {
        const el = panel.id ? document.getElementById(panel.id) : document.querySelectorAll('details')[panel.index];
        if (el) el.open = panel.open;
      }
      const admin = document.querySelector('#admin-panel');
      if (admin && !admin.hidden !== saved.adminOpen) document.querySelector('#admin-tools').click();
    } finally { restoring = false; write(key, snapshot()); }
  };
})();
