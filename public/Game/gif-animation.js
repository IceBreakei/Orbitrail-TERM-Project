/** Load predecoded GIF display frames while retaining original frame durations. */
export async function loadGifAnimation(character) {
  character.animationFrames = await Promise.all(character.gifFrames.map(frame =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ image, duration: frame.duration });
      image.onerror = () => reject(new Error(`Could not load ${frame.source}.`));
      image.src = frame.source;
    })
  ));
  character.image = character.animationFrames[0].image;
}

/** Select the original GIF frame for elapsed playback time, including while idle. */
export function gifFrameAt(frames, elapsed) {
  const total = frames.reduce((sum, frame) => sum + frame.duration, 0);
  let time = elapsed % total;
  for (let i = 0; i < frames.length; i++) {
    time -= frames[i].duration;
    if (time < 0) return i;
  }
  return 0;
}
