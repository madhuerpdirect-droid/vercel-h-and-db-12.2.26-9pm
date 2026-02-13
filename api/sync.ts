import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list } from '@vercel/blob';

const CLOUD_FILENAME = 'bhadrakali_db.json';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN as string;

  if (!token) {
    return res.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });
  }

  try {
    if (req.method === 'POST') {
      const data = req.body;

      await put(CLOUD_FILENAME, JSON.stringify(data, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        token
      });

      return res.status(200).json({ success: true });
    }

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

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sync failed" });
  }
}
