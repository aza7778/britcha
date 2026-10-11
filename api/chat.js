// Vercel serverless funksiyasi: saytdan so'rovni olib, Google Gemini API'ga yuboradi (bepul tarif).
// API kalit kodda emas, Vercel'dagi GEMINI_API_KEY o'zgaruvchisida saqlanadi.
module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!process.env.GEMINI_API_KEY) { res.status(500).send("GEMINI_API_KEY topilmadi (Vercel sozlamasida yo'q)"); return; }
  const { messages, images } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) { res.status(400).send("bad request"); return; }
  const contents = messages.slice(-20).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content).slice(0, 8000) }]
  }));
  const last = contents[contents.length - 1];
  if (Array.isArray(images) && images.length && last.role === "user") {
    last.parts.unshift(...images.slice(0, 5).map(i => ({ inline_data: { mime_type: i.media_type || "image/jpeg", data: i.data } })));
  }
  const model = process.env.MODEL || "gemini-2.5-flash";
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 8000 } })
    });
    if (!r.ok) { res.status(r.status).send(await r.text()); return; }
    const d = await r.json();
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    res.json({ text: parts.map(p => p.text || "").join("") });
  } catch (e) { res.status(500).send("server error"); }
};
