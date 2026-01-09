
// Offload heavy JSON.stringify and storage logic to a background thread
self.onmessage = (e: MessageEvent) => {
  const { STORAGE_KEY, saveData } = e.data;
  try {
    const serialized = JSON.stringify(saveData);
    // Note: In some environments, workers can't access localStorage directly.
    // If so, we post the serialized string back to the main thread for the actual write.
    // However, the heavy lifting (Stringify) is done here.
    self.postMessage({ success: true, serialized });
  } catch (error) {
    self.postMessage({ success: false, error: (error as Error).message });
  }
};
