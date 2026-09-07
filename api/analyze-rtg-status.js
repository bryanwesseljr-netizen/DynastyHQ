import sharedVisionHandler, { config as sharedConfig } from './analyze-coverage-reference.js';

export const config = sharedConfig;

export default async function handler(req, res) {
  req.body = {
    ...(req.body || {}),
    scanKind: 'rtg',
  };
  return sharedVisionHandler(req, res);
}
