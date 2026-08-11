const dataUrlToBlob = (dataUrl) => {
  const commaIndex = String(dataUrl || '').indexOf(',');
  if (commaIndex < 0) throw new Error('The prepared image could not be read.');
  const header = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  const mimeType = header.match(/^data:([^;,]+)/i)?.[1] || 'image/jpeg';

  try {
    const binary = header.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  } catch {
    throw new Error('The prepared image could not be converted for upload.');
  }
};

const withTimeout = (promise, timeoutMs, message) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  Promise.resolve(promise).then(
    (value) => { clearTimeout(timer); resolve(value); },
    (error) => { clearTimeout(timer); reject(error); },
  );
});

const waitForUpload = (task, timeoutMs = 45000) => new Promise((resolve, reject) => {
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    try { task.cancel(); } catch { /* no-op */ }
    reject(new Error('The photo upload timed out. Check your connection and try again.'));
  }, timeoutMs);

  task.on('state_changed', undefined, (error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    reject(error);
  }, () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve(task.snapshot);
  });
});

const safePart = (value, fallback) => String(value || fallback)
  .replace(/[^a-zA-Z0-9_-]/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 120);

const friendlyStorageError = (error) => {
  if (error?.message?.includes('timed out')) return error;
  const code = String(error?.code || '');
  if (code.includes('unauthorized')) return new Error('Firebase Storage blocked this upload. Sign in again and retry.');
  if (code.includes('canceled')) return new Error('The photo upload was canceled before it finished.');
  if (code.includes('quota')) return new Error('Firebase Storage quota was reached. Try again later or check the project storage quota.');
  if (code.includes('retry-limit')) return new Error('The photo upload could not finish after several retries. Check your connection and try again.');
  return new Error(error?.message || 'The newsroom photo could not be uploaded.');
};

export const uploadNewsroomMedia = async ({
  firebaseApp,
  appId,
  userId,
  assetId,
  imageDataUrl,
  fileName,
  origin = 'upload',
}) => {
  if (!firebaseApp || !userId || !assetId || !imageDataUrl) throw new Error('The newsroom upload is missing required information.');
  const { getDownloadURL, getStorage, ref, uploadBytesResumable } = await import('firebase/storage');
  const storage = getStorage(firebaseApp);
  const blob = dataUrlToBlob(imageDataUrl);
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `artifacts/${safePart(appId, 'dynasty-hq')}/users/${safePart(userId, 'owner')}/newsroom_media/${safePart(assetId, 'image')}.${extension}`;
  const storageRef = ref(storage, storagePath);

  try {
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: 'private,max-age=31536000,immutable',
      customMetadata: {
        originalFileName: String(fileName || 'newsroom-photo').slice(0, 180),
        origin: String(origin).slice(0, 40),
      },
    });
    await waitForUpload(task);
    const downloadUrl = await withTimeout(
      getDownloadURL(storageRef),
      15000,
      'The photo uploaded, but DynastyHQ could not retrieve its library URL. Try again.',
    );
    return {
      downloadUrl,
      storagePath,
      mimeType: blob.type || 'image/jpeg',
      sizeBytes: blob.size,
    };
  } catch (error) {
    throw friendlyStorageError(error);
  }
};

export const deleteNewsroomMedia = async ({ firebaseApp, storagePath }) => {
  if (!firebaseApp || !storagePath) return;
  const { deleteObject, getStorage, ref } = await import('firebase/storage');
  const storage = getStorage(firebaseApp);
  await withTimeout(
    deleteObject(ref(storage, storagePath)),
    20000,
    'Deleting this photo took too long. Try again.',
  );
};
