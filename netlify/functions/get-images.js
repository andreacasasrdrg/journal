// /netlify/functions/get-images.js
export async function handler(event) {
  // CORS headers (if you want to access externally later)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  // Try load dotenv locally (no-op in Netlify production)
  try {
    // eslint-disable-next-line global-require
    require("dotenv").config();
  } catch (e) {}

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
  const apiSecret =
    process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;

  let auth = process.env.CLOUDINARY_BASIC_AUTH;
  if (!auth && apiKey && apiSecret) {
    auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  }

  try {
    const headersReq = auth ? { Authorization: `Basic ${auth}` } : {};
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=500`,
      { headers: headersReq }
    );

    if (res.status === 401 || res.status === 403) {
      const text = await res.text();
      console.warn("Cloudinary auth failed", res.status, text);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Invalid Cloudinary credentials or insufficient permissions",
        }),
      };
    }

    const data = await res.json();
    console.log("data", data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(
        Array.isArray(data.resources)
          ? data.resources.map((r) => ({ url: r.secure_url || r.url }))
          : data
      ),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
