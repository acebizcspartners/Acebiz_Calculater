// Vercel serverless function — verifies the app password against ACCESS_PASSWORD env var.
// Does not issue a token; the frontend stores the verified password in sessionStorage
// and sends it as x-app-password on subsequent /api/claude calls.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  const expectedPassword = process.env.ACCESS_PASSWORD;
  if (!expectedPassword) {
    return res.status(500).json({
      error: { message: "Server not configured: ACCESS_PASSWORD env var missing" },
    });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: { message: "Password required" } });
  }

  if (password !== expectedPassword) {
    return res.status(401).json({ error: { message: "Incorrect password" } });
  }

  return res.status(200).json({ ok: true });
}
