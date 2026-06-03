import { put, get, list } from '@vercel/blob';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { result } = req.body;
    const BLOB_NAME = 'quiz-results.json';

    let results = [];
    try {
      const { blobs } = await list({ prefix: BLOB_NAME });
      if (blobs.length > 0) {
        const blob = await get(blobs[0].url);
        const text = await blob.text();
        results = JSON.parse(text);
      }
    } catch (e) {
      // First time, no existing data
    }

    results.push(result);

    await put(BLOB_NAME, JSON.stringify(results), {
      access: 'public',
      addRandomSuffix: false
    });

    res.json({ ok: true, total: results.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
