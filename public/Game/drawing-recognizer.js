/** Own a worker and route recognition results without blocking animation or uploading sketches. */
export function createDrawingRecognizer() {
  let worker, nextId = 0;
  const pending = new Map();
  function getWorker() {
    if (!worker) {
      worker = new Worker(new URL('./drawing-recognizer.worker.js', import.meta.url), { type: 'module' });
      worker.addEventListener('message', ({ data }) => {
        const job = pending.get(data.id);
        if (!job) return;
        pending.delete(data.id); clearTimeout(job.timeout);
        if (data.error) job.reject(new Error(data.error)); else job.resolve(data.predictions || []);
      });
      worker.addEventListener('error', () => {
        for (const job of pending.values()) { clearTimeout(job.timeout); job.reject(new Error('Drawing recognition could not start. Check your connection and retry.')); }
        pending.clear(); worker.terminate(); worker = null;
      });
    }
    return worker;
  }
  function request(type, image) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      try { const target = getWorker(); const timeout = setTimeout(() => { pending.delete(id); reject(new Error('Drawing recognition timed out. Please retry.')); }, 120000); pending.set(id, { resolve, reject, timeout }); target.postMessage({ id, type, image }); }
      catch (error) { const job = pending.get(id); if (job) clearTimeout(job.timeout); pending.delete(id); reject(error); }
    });
  }
  return {
    warmup: () => request('warmup'),
    recognize: image => request('classify', image),
    recognizeSymbol: image => request('symbol', image),
    dispose() {
      worker?.terminate(); worker = null;
      for (const job of pending.values()) { clearTimeout(job.timeout); job.reject(new Error('Recognition closed.')); }
      pending.clear();
    }
  };
}
