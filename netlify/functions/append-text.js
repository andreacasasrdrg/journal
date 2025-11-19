exports.handler = async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    require('dotenv').config();
  } catch (e) {}

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Cloudinary credentials' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { date, content } = body;

    if (!date || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing date or content' }),
      };
    }

    const publicId = `texts/${date}`;

    // Attempt to read existing asset for this date
    let existingEntries = [];
    try {
      let auth = process.env.CLOUDINARY_BASIC_AUTH;
      if (!auth && apiKey && apiSecret) {
        auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      }

      const prefix = publicId;
      const listUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/raw/upload?prefix=${prefix}&max_results=1`;
      const listRes = await fetch(listUrl, { headers: auth ? { Authorization: `Basic ${auth}` } : {} });

      const listText = await listRes.text();
      if (listRes.ok) {
        try {
          const listJson = JSON.parse(listText);
          if (listJson.resources && listJson.resources.length > 0) {
            const resource = listJson.resources[0];
            try {
              const fileRes = await fetch(resource.secure_url || resource.url);
              const fileJson = await fileRes.json();
              if (Array.isArray(fileJson)) {
                existingEntries = fileJson.filter(Boolean);
              } else if (fileJson && typeof fileJson === 'object') {
                existingEntries = [fileJson];
              }
            } catch (e) {
              console.warn('Failed to fetch existing raw file, continuing with empty array', e);
            }
          }
        } catch (e) {
          console.warn('Failed to parse list response JSON', e, listText);
        }
      } else {
        console.warn('Cloudinary list request failed', listRes.status, listText);
      }
    } catch (e) {
      console.warn('Error when trying to read existing Cloudinary resource', e);
    }

    const newEntry = { date, content, uploaded: new Date().toISOString() };
    existingEntries.push(newEntry);

    const textData = JSON.stringify(existingEntries, null, 2);
    const base64Content = Buffer.from(textData).toString('base64');
    const dataUri = `data:application/json;base64,${base64Content}`;

    const timestamp = Math.floor(Date.now() / 1000);

    // Sign parameters: include public_id, overwrite and timestamp
    const paramsToSign = {
      public_id: publicId,
      overwrite: 'true',
      timestamp: String(timestamp),
    };

    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join('&');

    const crypto = require('crypto');
    const signature = crypto
      .createHash('sha1')
      .update(sortedParams + apiSecret)
      .digest('hex');

    const formData = new (globalThis.FormData)();
    formData.append('file', dataUri);
    formData.append('public_id', publicId);
    formData.append('resource_type', 'raw');
    formData.append('overwrite', 'true');
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;

    const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
    const uploadJson = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error('Cloudinary overwrite upload failed', uploadJson);
      return {
        statusCode: uploadRes.status,
        headers,
        body: JSON.stringify({ error: uploadJson.error?.message || 'Upload failed' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, url: uploadJson.secure_url, public_id: uploadJson.public_id }),
    };
  } catch (err) {
    console.error('Error in append-text:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
