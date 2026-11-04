import { skillCastSettings } from './game-config.js';

let classifier, clipClassifier, RawImage;
/** Load the quantized QuickDraw classifier once, off the gameplay/UI thread. */
async function loadClassifier() {
  if (!classifier) {
    classifier = (async () => {
      const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
      const { pipeline, env } = transformers;
      RawImage = transformers.RawImage;
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      return pipeline('image-classification', skillCastSettings.model, { device: 'wasm', dtype: 'q8' });
    })().catch(error => { classifier = null; throw error; });
  }
  return classifier;
}

/** Load CLIP lazily in the same worker; cache weights between casts. */
async function loadClipClassifier() {
  if (!clipClassifier) {
    clipClassifier = (async () => {
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      return pipeline('zero-shot-image-classification', skillCastSettings.clipModel,
        { device: 'wasm', dtype: 'q8' });
    })().catch(error => { clipClassifier = null; throw error; });
  }
  return clipClassifier;
}

// Explicit alternatives prevent a single candidate from always receiving a perfect score.
const symbolLabels = [
  'a hand drawn circle enclosing an arrow above an X cross',
  'a hand drawn empty circle',
  'a hand drawn circle with only an arrow inside',
  'a hand drawn circle with only an X inside',
  'a hand drawn circle with an X above an arrow',
  'random scribbles and unrelated shapes'
];

/** Receive normalized black-on-white PNGs and return ranked QuickDraw predictions. */
self.addEventListener('message', async ({ data }) => {
  try {
    if (data.type === 'symbol') {
      const pipe = await loadClipClassifier();
      const predictions = await pipe(data.image, symbolLabels);
      self.postMessage({ id: data.id, predictions });
      return;
    }
    const pipe = await loadClassifier();
    if (data.type === 'warmup') { self.postMessage({ id: data.id, ready: true }); return; }
    // QuickDraw expects one channel; RGBA canvas PNGs must be explicitly converted.
    const image = (await RawImage.read(data.image)).grayscale();
    // QuickDraw bitmap training uses light strokes on a dark background.
    for (let i = 0; i < image.data.length; i++) image.data[i] = 255 - image.data[i];
    const predictions = await pipe(image, { top_k: 3 });
    self.postMessage({ id: data.id, predictions });
  } catch (error) {
    self.postMessage({ id: data.id, error: error.message || 'Drawing recognition failed.' });
  }
});
