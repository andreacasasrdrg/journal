exports.handler = async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  try {
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
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/raw/upload?prefix=texts/&max_results=500`,
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
    if (!data.resources || data.resources.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([]),
      };
    }

    const textPromises = data.resources.map(async (resource) => {
      const url = resource.secure_url || resource.url;
      try {
        const textRes = await fetch(url);
        // Try parsing JSON first (clone so we can read body again if needed)
        try {
          const json = await textRes.clone().json();
          return json;
        } catch (jsonErr) {
          // Not valid JSON via json(), fall back to text
          const txt = await textRes.text();
          try {
            const parsed = JSON.parse(txt);
            return parsed;
          } catch (parseErr) {
            // Plain text — wrap into a consistent object
            console.warn("Non-JSON text for", resource.public_id);
            let date = null;
            const m =
              resource.public_id &&
              resource.public_id.match(/(20\d{2}-\d{2}-\d{2})/);
            if (m) date = m[1];
            const wrapped = {
              public_id: resource.public_id,
              date: date || resource.created_at || null,
              content: txt,
            };
            return wrapped;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch/parse text:", resource.public_id, e);
        return null;
      }
    });

    const textsRaw = (await Promise.all(textPromises)).filter(Boolean);

    // Flatten responses: each resource may contain a single object or an array of entries
    const flattened = [];
    for (const item of textsRaw) {
      if (!item) continue;
      if (Array.isArray(item)) {
        for (const entry of item) {
          if (entry) flattened.push(entry);
        }
      } else if (typeof item === "object") {
        flattened.push(item);
      }
    }

    const sanitized = flattened.map((item) => {
      try {
        return JSON.parse(JSON.stringify(item));
      } catch (e) {
        return {
          public_id: item && item.public_id ? String(item.public_id) : null,
          date: item && item.date ? String(item.date) : null,
          content:
            item && item.content ? String(item.content) : String(item || ""),
        };
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(sanitized),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
