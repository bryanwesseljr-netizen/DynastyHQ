export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return res.status(200).json({
    environment: process.env.VERCEL_ENV || '',
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF || '',
    hasGeminiApiKey: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
    hasGeminiTtsModelOverride: Boolean(String(process.env.GEMINI_TTS_MODEL || '').trim()),
    hasGeminiMarkVoiceOverride: Boolean(String(process.env.GEMINI_TTS_MARK_VOICE || '').trim()),
    hasGeminiSarahVoiceOverride: Boolean(String(process.env.GEMINI_TTS_SARAH_VOICE || '').trim()),
  });
}
