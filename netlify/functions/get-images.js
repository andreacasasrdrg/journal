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

  const cloudName = "dxpcxm7zo";
  const auth = Buffer.from(
    "448269291172716:m8wcj-C8VBETwueoARhGV0JHBhE"
  ).toString("base64");

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image`,
      { headers: { Authorization: `Basic ${auth}` } }
    );

    const data = await res.json();
    process.stdout.write(
      "\nCloudinary raw response:\n" + JSON.stringify(data, null, 2) + "\n\n"
    );
    // 👇 Log to Netlify console so you can see it
    console.log("Cloudinary response:", data);
    return {
      statusCode: 200,
      headers,
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
