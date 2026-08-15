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

const safePart = (value, fallback) => String(value || fallback)
  .replace(/[^a-zA-Z0-9_-]/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 120);

const withTimeout = (promise, timeoutMs, message) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  Promise.resolve(promise).then(
    (value) => { clearTimeout(timer); resolve(value); },
    (error) => { clearTimeout(timer); reject(error); },
  );
});

const getOwnerToken = async (firebaseApp, userId) => {
  if (!firebaseApp || !userId) throw new Error('Sign in as the DynastyHQ owner before uploading photos.');
  const { getAuth } = await import('firebase/auth');
  const currentUser = getAuth(firebaseApp).currentUser;
  if (!currentUser || currentUser.uid !== userId) throw new Error('Your DynastyHQ sign-in expired. Sign in again and retry.');
  return currentUser.getIdToken();
};

const friendlyBlobError = (error) => {
  const message = String(error?.message || '');
  if (error?.name === 'AbortError' || message.toLowerCase().includes('aborted')) {
    return new Error('The photo upload took too long and was canceled. Try again.');
  }
  if (/401|unauthor/i.test(message)) return new Error('DynastyHQ could not authorize this photo upload. Sign in again and retry.');
  if (/413|too large|maximum size/i.test(message)) return new Error('That photo is too large for the Career Photo Library. Choose an image under 12 MB.');
  if (/blob_store_id|blob store|credentials|oidc/i.test(message)) return new Error('Vercel Blob is not available to this preview yet. Check the Preview storage connection and retry.');
  return new Error(message || 'The newsroom photo could not be uploaded.');
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
  const blob = dataUrlToBlob(imageDataUrl);
  if (blob.size > 12_000_000) throw new Error('That photo is larger than 12 MB. Choose a smaller image.');

  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const pathname = `${safePart(appId, 'dynasty-hq')}/${safePart(userId, 'owner')}/newsroom-media/${safePart(assetId, 'image')}-${Date.now()}.${extension}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const idToken = await getOwnerToken(firebaseApp, userId);
    const { uploadPresigned } = await import('@vercel/blob/client');
    const uploaded = await uploadPresigned(pathname, blob, {
      access: 'public',
      handleUploadUrl: '/api/newsroom-media',
      contentType: blob.type || 'image/jpeg',
      headers: { Authorization: `Bearer ${idToken}` },
      multipart: blob.size > 5_000_000,
      abortSignal: controller.signal,
      clientPayload: JSON.stringify({
        assetId: String(assetId).slice(0, 180),
        fileName: String(fileName || 'newsroom-photo').slice(0, 180),
        origin: String(origin).slice(0, 40),
      }),
    });

    return {
      downloadUrl: uploaded.url,
      storagePath: uploaded.url,
      mimeType: uploaded.contentType || blob.type || 'image/jpeg',
      sizeBytes: blob.size,
      storageProvider: 'vercel-blob',
    };
  } catch (error) {
    throw friendlyBlobError(error);
  } finally {
    clearTimeout(timer);
  }
};

const deleteVercelBlob = async ({ firebaseApp, storagePath }) => {
  const { getAuth } = await import('firebase/auth');
  const currentUser = getAuth(firebaseApp).currentUser;
  if (!currentUser) throw new Error('Sign in as the DynastyHQ owner before deleting photos.');
  const idToken = await currentUser.getIdToken();
  const response = await withTimeout(fetch('/api/newsroom-media', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: storagePath }),
  }), 20_000, 'Deleting this photo took too long. Try again.');

  if (!response.ok) {
    let message = 'The image could not be deleted from Vercel Blob.';
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch { /* keep fallback */ }
    throw new Error(message);
  }
};

export const deleteNewsroomMedia = async ({ firebaseApp, storagePath }) => {
  if (!firebaseApp || !storagePath) return;

  if (/^https?:\/\//i.test(storagePath)) {
    await deleteVercelBlob({ firebaseApp, storagePath });
    return;
  }

  // Backward compatibility for any media assets created before the Vercel Blob migration.
  const { deleteObject, getStorage, ref } = await import('firebase/storage');
  const storage = getStorage(firebaseApp);
  await withTimeout(
    deleteObject(ref(storage, storagePath)),
    20_000,
    'Deleting this legacy photo took too long. Try again.',
  );
};
