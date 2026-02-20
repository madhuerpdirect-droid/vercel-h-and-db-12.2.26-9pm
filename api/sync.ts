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

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFileName = `backup_${timestamp}.json`;

// 1️⃣ Save main DB file
await put(CLOUD_FILENAME, JSON.stringify(bodyData, null, 2), {
  access: 'public',
  addRandomSuffix: false,
  token
});

// 2️⃣ Save backup copy
await put(backupFileName, JSON.stringify(bodyData, null, 2), {
  access: 'public',
  addRandomSuffix: false,
  token
});

      return res.status(200).json({ success: true });
    }

    // ---------- LOAD (GET) ----------
    if (req.method === 'GET') {

  const { blobs } = await list({ token });

  // Find main DB file
  const dbBlob = blobs.find(b => b.pathname === CLOUD_FILENAME);

  let mainData = null;

  if (dbBlob) {
    const response = await fetch(dbBlob.url);
    mainData = await response.json();
  }

  // Collect all backup files
  const backups = blobs
    .filter(b => b.pathname.startsWith('backup_'))
    .map(b => ({
      file: b.pathname,
      url: b.url,
      uploadedAt: b.uploadedAt
    }));

  return res.status(200).json({
    data: mainData,
    backups
  });
}

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('SYNC ERROR:', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
