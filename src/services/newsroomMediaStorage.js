import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('The prepared image could not be read.');
  return response.blob();
};

const safePart = (value, fallback) => String(value || fallback)
  .replace(/[^a-zA-Z0-9_-]/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 120);

export const uploadNewsroomMedia = async ({
  storage,
  appId,
  userId,
  assetId,
  imageDataUrl,
  fileName,
  origin = 'upload',
}) => {
  if (!storage || !userId || !assetId || !imageDataUrl) throw new Error('The newsroom upload is missing required information.');
  const blob = await dataUrlToBlob(imageDataUrl);
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `artifacts/${safePart(appId, 'dynasty-hq')}/users/${safePart(userId, 'owner')}/newsroom_media/${safePart(assetId, 'image')}.${extension}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: 'private,max-age=31536000,immutable',
    customMetadata: {
      originalFileName: String(fileName || 'newsroom-photo').slice(0, 180),
      origin: String(origin).slice(0, 40),
    },
  });
  return {
    downloadUrl: await getDownloadURL(storageRef),
    storagePath,
    mimeType: blob.type || 'image/jpeg',
    sizeBytes: blob.size,
  };
};

export const deleteNewsroomMedia = async ({ storage, storagePath }) => {
  if (!storage || !storagePath) return;
  await deleteObject(ref(storage, storagePath));
};
