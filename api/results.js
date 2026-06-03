import { get, list } from '@vercel/blob';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const adminPw = process.env.ADMIN_PASSWORD || 'nadira123';
  const { password } = req.query;

  if (password !== adminPw) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { blobs } = await list({ prefix: 'quiz-results.json' });
    if (blobs.length === 0) return res.json([]);

    const blob = await get(blobs[0].url);
    const text = await blob.text();
    const results = JSON.parse(text);

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
