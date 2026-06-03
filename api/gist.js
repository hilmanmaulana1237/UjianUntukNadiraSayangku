export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GIST_ID;

  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN belum di-set' });
  }
  if (!gistId) {
    return res.status(500).json({ error: 'GIST_ID belum di-set. Buat gist & copy ID-nya' });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  const gistUrl = `https://api.github.com/gists/${gistId}`;
  const filename = 'results.json';

  // GET — ambil data (dengan password)
  if (req.method === 'GET') {
    const adminPw = process.env.ADMIN_PASSWORD || 'nadira123';
    if (req.query.password !== adminPw) {
      return res.status(401).json({ error: 'Password salah' });
    }

    try {
      const resp = await fetch(gistUrl, { headers });
      if (resp.status === 404) return res.json([]);
      if (!resp.ok) return res.status(500).json({ error: `GitHub error ${resp.status}` });

      const gist = await resp.json();
      const content = gist.files?.[filename]?.content;
      return res.json(content ? JSON.parse(content) : []);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — simpan hasil quiz baru
  if (req.method === 'POST') {
    try {
      let existing = [];
      const resp = await fetch(gistUrl, { headers });
      if (resp.ok) {
        const gist = await resp.json();
        const content = gist.files?.[filename]?.content;
        if (content) existing = JSON.parse(content);
      }

      existing.push(req.body);

      await fetch(gistUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          files: { [filename]: { content: JSON.stringify(existing, null, 2) } }
        })
      });

      return res.json({ ok: true, total: existing.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE — hapus satu / hapus semua
  if (req.method === 'DELETE') {
    const adminPw = process.env.ADMIN_PASSWORD || 'nadira123';
    if (req.query.password !== adminPw) {
      return res.status(401).json({ error: 'Password salah' });
    }

    try {
      const resp = await fetch(gistUrl, { headers });
      if (!resp.ok) return res.json({ ok: true });

      const gist = await resp.json();
      const content = gist.files?.[filename]?.content;
      let data = content ? JSON.parse(content) : [];

      if (req.query.clear === 'true') {
        data = [];
      } else if (req.query.id) {
        data = data.filter(r => r.id !== parseInt(req.query.id));
      }

      await fetch(gistUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          files: { [filename]: { content: JSON.stringify(data, null, 2) } }
        })
      });

      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
