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
    require("dotenv").config();
  } catch (e) {}

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
  const apiSecret =
    process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Missing Cloudinary credentials" }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { date, content } = body;

    if (!date || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing date or content" }),
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `texts/${date}_${timestamp}`;
    
    const textData = JSON.stringify({ date, content, uploaded: new Date().toISOString() });
    const base64Content = Buffer.from(textData).toString('base64');
    const dataUri = `data:application/json;base64,${base64Content}`;

    const formData = new (globalThis.FormData)();
    formData.append('file', dataUri);
    formData.append('public_id', publicId);
    formData.append('resource_type', 'raw');
    formData.append('api_key', apiKey);
    
    const paramsToSign = {
      public_id: publicId,
      timestamp: String(timestamp)
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

    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Cloudinary upload error:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: result.error?.message || 'Upload failed' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      }),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
