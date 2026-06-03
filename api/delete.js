import { put, get, del, list } from '@vercel/blob';

export default async function handler(req, res) {
  const adminPw = process.env.ADMIN_PASSWORD || 'nadira123';
  const { password, id, clear } = req.query;

  if (password !== adminPw) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const BLOB_NAME = 'quiz-results.json';
    const { blobs } = await list({ prefix: BLOB_NAME });

    if (clear === 'true') {
      if (blobs.length > 0) {
        await del(blobs[0].url);
      }
      return res.json({ ok: true, cleared: true });
    }

    if (id) {
      let results = [];
      if (blobs.length > 0) {
        const blob = await get(blobs[0].url);
        const text = await blob.text();
        results = JSON.parse(text);
      }

      results = results.filter(r => r.id !== parseInt(id));

      await put(BLOB_NAME, JSON.stringify(results), {
        access: 'public',
        addRandomSuffix: false
      });

      return res.json({ ok: true, deleted: true });
    }

    res.status(400).json({ error: 'Specify id or clear=true' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
