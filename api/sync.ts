import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list } from '@vercel/blob';

const CLOUD_FILENAME = 'bhadrakali_db.json';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'Missing BLOB_READ_WRITE_TOKEN' });
  }

  try {

    // ---------- SAVE (POST) ----------
    if (req.method === 'POST') {

      let bodyData;

      // handle both string and object body safely
      if (typeof req.body === 'string') {
        bodyData = JSON.parse(req.body);
      } else {
        bodyData = req.body;
      }

      if (!bodyData) {
        return res.status(400).json({ error: 'No data received' });
      }

      await put(CLOUD_FILENAME, JSON.stringify(bodyData, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        token
      });

      return res.status(200).json({ success: true });
    }

    // ---------- LOAD (GET) ----------
    if (req.method === 'GET') {
      const { blobs } = await list({ token });
      const dbBlob = blobs.find(b => b.pathname === CLOUD_FILENAME);

      if (!dbBlob) {
        return res.status(200).json({ data: null });
      }

      const response = await fetch(dbBlob.url);
      const json = await response.json();

      return res.status(200).json({ data: json });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('SYNC ERROR:', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
