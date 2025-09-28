// app/api/chat/route.js
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SYSTEM_PROMPT = `
You are a normal ChatGPT-style assistant. Be clear, accurate, and concise.
Answer directly unless the input is an image command (handled server-side).
`.trim();

const isImageCmd = (t = "") => /^\/img\s+/i.test(String(t).trim());

// ✅ LAZY INIT — nothing at top-level reads env or constructs the client
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

// Defensive: remove params that some models reject (temperature, max_*_tokens)
function sanitizeParams(obj = {}) {
  const out = { ...obj };
  delete out.temperature;
  delete out.top_p;
  delete out.max_tokens;
  delete out.max_completion_tokens;
  delete out.max_output_tokens;
  return out;
}

export async function POST(req) {
  // Parse input
  let payload = {};
  try { payload = await req.json(); }
  catch { return NextResponse.json({ reply: "Invalid request body." }, { status: 400 }); }

  const { content = "", history = [] } = payload;
  const text = String(content || "").trim();

  try {
    const openai = getOpenAI(); // ✅ constructed only at request time

    // /img ... → image branch
    if (isImageCmd(text)) {
      const prompt = text.replace(/^\/img\s+/i, "").trim();
      if (!prompt) return NextResponse.json({ reply: "Give me something to draw after /img." });

      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });

      const url = img?.data?.[0]?.url || "";
      if (!url) return NextResponse.json({ reply: "Image service returned nothing." }, { status: 502 });
      return NextResponse.json({ reply: `Image: ${prompt}`, imageUrl: url });
    }

    // Chat branch
    const shortHistory = (history || []).slice(-8).map((m) => ({
      role: m.role === "assistant" || m.role === "system" ? m.role : "user",
      content: String(m.content ?? ""),
    }));

    const params = sanitizeParams({
      model: "gpt-5",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...shortHistory,
        { role: "user", content: text },
      ],
    });

    const completion = await openai.chat.completions.create(params);
    const reply = (completion.choices?.[0]?.message?.content || "Noted.").trim();
    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e?.response?.data?.error?.message || e?.message || "Chat service error. Try again.";
    const status = String(msg).includes("OPENAI_API_KEY") ? 500 : 502;
    return NextResponse.json({ reply: msg }, { status });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: "gpt-5", images: true });
}
