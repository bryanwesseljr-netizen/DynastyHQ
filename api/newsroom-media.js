import { del, issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned } from '@vercel/blob/client';
import { json, verifyFirebaseUser } from './_auth.js';

const MAX_UPLOAD_BYTES = 12_000_000;
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const safePart = (value, fallback) => String(value || fallback)
  .replace(/[^a-zA-Z0-9_-]/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 120);

const ownerPrefix = (userId) => `dynasty-hq/${safePart(userId, 'owner')}/newsroom-media/`;

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  return body;
};

const verifyOwner = async (authorization) => {
  const user = await verifyFirebaseUser(authorization);
  return user?.localId ? user : null;
};

const isAllowedBlobUrl = (value, userId) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.blob.vercel-storage.com')) return false;
    return decodeURIComponent(url.pathname.replace(/^\/+/, '')).startsWith(ownerPrefix(userId));
  } catch {
    return false;
  }
};

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (!['POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'POST, DELETE');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  if (!process.env.BLOB_STORE_ID) {
    return json(res, 503, { error: 'Vercel Blob is not connected to this environment yet.' });
  }

  let user;
  try {
    user = await verifyOwner(req.headers.authorization);
  } catch (error) {
    console.error('Newsroom media auth failed', error);
    return json(res, 503, { error: 'DynastyHQ could not verify your signed-in session.' });
  }
  if (!user) return json(res, 401, { error: 'Sign in as the DynastyHQ owner before managing photos.' });

  if (req.method === 'DELETE') {
    const body = parseBody(req.body);
    const url = String(body.url || '').trim();
    if (!isAllowedBlobUrl(url, user.localId)) {
      return json(res, 403, { error: 'That photo does not belong to this DynastyHQ media library.' });
    }

    try {
      await del(url);
      return json(res, 200, { ok: true });
    } catch (error) {
      console.error('Vercel Blob delete failed', error);
      return json(res, 502, { error: error?.message || 'The photo could not be deleted from Vercel Blob.' });
    }
  }

  const body = parseBody(req.body);
  try {
    const result = await handleUploadPresigned({
      body,
      request: req,
      webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname) => {
        const expectedPrefix = ownerPrefix(user.localId);
        if (!String(pathname || '').startsWith(expectedPrefix)) {
          throw new Error('The requested media path is not allowed for this account.');
        }

        const validUntil = Date.now() + (10 * 60 * 1000);
        const token = await issueSignedToken({
          pathname,
          operations: ['put'],
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          validUntil,
        });

        return {
          token,
          urlOptions: {
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_UPLOAD_BYTES,
            validUntil,
            addRandomSuffix: false,
            allowOverwrite: false,
            cacheControlMaxAge: 365 * 24 * 60 * 60,
          },
        };
      },
    });

    return json(res, 200, result);
  } catch (error) {
    console.error('Vercel Blob presigned upload failed', error);
    const message = String(error?.message || 'The photo upload could not be authorized.');
    const status = /not authorized|sign in|not allowed/i.test(message) ? 401 : 400;
    return json(res, status, { error: message });
  }
}
