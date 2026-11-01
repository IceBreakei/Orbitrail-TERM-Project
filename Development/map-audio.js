// Stream only the current and fading-out music; never decode whole long tracks.
export const mapTracks = {
  first: 'stage 1 - Feverdream.mp3',
  second: 'stage 2 - PAN PAKA PANNNNNNNNN!!!!!!!!!!!!!!!!!!!!!!!!!.mp3',
  third: 'Stage 3 - new years.mp3',
  fourth: 'stage 4 - USAGI FLAP.mp3'
};

// Per-track source volume at 100% on the master slider.
export const trackVolumeScale = { first: 0.6, second: 1, third: 0.6, fourth: 0.6 };

/** Manage gesture-started looping music, volume, and map-change crossfades. */
export function createMapAudio(initialMap) {
  const slider = document.querySelector('#music-volume');
  const output = document.querySelector('#music-volume-value');
  const button = document.querySelector('#music-toggle');
  const status = document.querySelector('#music-status');
  const fadeDuration = 900; // EDIT milliseconds to match the checkerboard ripple.
  const tracks = new Map();
  let mapId = initialMap;
  let volume = Number(slider.value) / 100;
  let enabled = true;
  let unlocked = false;
  let disposed = false;
  let blocked = false;

  /** Stop, rewind, and release the media source once its fade has finished. */
  function stopTrack(id, track) {
    track.audio.pause();
    track.audio.currentTime = 0;
    track.audio.removeAttribute('src');
    track.audio.load();
    tracks.delete(id);
  }

  /** Start only the selected map track, fading every previous one toward silence. */
  function selectTrack() {
    for (const track of tracks.values()) {
      track.from = track.gain;
      track.target = 0;
      track.elapsed = 0;
    }
    if (!unlocked || !enabled || disposed) return;
    let track = tracks.get(mapId);
    if (!track) {
      const audio = new Audio();
      audio.preload = 'none';
      audio.loop = true;
      audio.volume = 0;
      audio.src = `../Audio/${encodeURIComponent(mapTracks[mapId])}`;
      track = { audio, gain: 0, from: 0, target: 1, elapsed: 0, volumeScale: trackVolumeScale[mapId] };
      tracks.set(mapId, track);
      const trackMap = mapId;
      audio.addEventListener('error', () => {
        if (mapId === trackMap) status.textContent = `Could not load ${mapTracks[trackMap]}.`;
      });
    }
    track.from = track.gain;
    track.target = 1;
    track.elapsed = 0;
    const selectedMap = mapId;
    track.audio.play().then(() => {
      if (mapId === selectedMap && enabled) {
        blocked = false;
        status.textContent = mapTracks[selectedMap];
      }
    }).catch(() => {
      if (mapId === selectedMap) {
        blocked = true;
        button.textContent = 'Play music';
        status.textContent = 'Press Play music to enable audio.';
      }
    });
  }

  /** Crossfade to a new map without keeping inactive long recordings playing. */
  function setMap(id) {
    if (!mapTracks[id] || id === mapId) return;
    mapId = id;
    selectTrack();
  }

  /** Advance smooth gains and unload tracks that are no longer in use. */
  function update(delta) {
    for (const [id, track] of tracks) {
      track.elapsed += delta * 1000;
      const t = Math.min(1, track.elapsed / fadeDuration);
      const eased = t * t * (3 - 2 * t);
      track.gain = track.from + (track.target - track.from) * eased;
      track.audio.volume = Math.max(0, Math.min(1, volume * track.volumeScale * track.gain));
      if (t === 1 && track.target === 0) stopTrack(id, track);
    }
  }

  /** Honor browser audio activation by starting on the first user gesture. */
  function unlock(event) {
    if (event.target?.closest?.('#music-toggle')) return;
    if (unlocked || disposed) return;
    unlocked = true;
    selectTrack();
  }
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });

  slider.addEventListener('input', () => {
    volume = Number(slider.value) / 100;
    output.textContent = `${slider.value}%`;
    for (const track of tracks.values()) track.audio.volume = volume * track.volumeScale * track.gain;
  });
  button.addEventListener('click', () => {
    // The first explicit click enables playback; later clicks toggle it.
    if (!unlocked || blocked) { unlocked = true; enabled = true; blocked = false; }
    else enabled = !enabled;
    button.textContent = enabled ? 'Pause music' : 'Play music';
    button.setAttribute('aria-pressed', String(enabled));
    selectTrack();
  });

  /** Release every track immediately when leaving the preview. */
  function stopAll() {
    disposed = true;
    for (const [id, track] of tracks) stopTrack(id, track);
  }
  window.addEventListener('pagehide', stopAll);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    // Animation frames may pause in background tabs: don't leave old music playing.
    for (const [id, track] of tracks) {
      if (track.target === 0) stopTrack(id, track);
    }
  });
  output.textContent = `${slider.value}%`;
  return { setMap, update, stopAll };
}
