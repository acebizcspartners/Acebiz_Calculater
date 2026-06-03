// Vercel serverless function — proxies Anthropic Messages API.
// Keeps ANTHROPIC_API_KEY server-side; verifies caller via ACCESS_PASSWORD.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  const expectedPassword = process.env.ACCESS_PASSWORD;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!expectedPassword || !apiKey) {
    return res.status(500).json({
      error: { message: "Server not configured: missing ACCESS_PASSWORD or ANTHROPIC_API_KEY env vars" },
    });
  }

  const providedPassword = req.headers["x-app-password"];
  if (providedPassword !== expectedPassword) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  const body = req.body || {};
  const { model, max_tokens, messages } = body;
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: "Bad request: model and messages are required" } });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: max_tokens || 4096,
        messages,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({
      error: { message: err?.message || "Upstream Anthropic API request failed" },
    });
  }
}
