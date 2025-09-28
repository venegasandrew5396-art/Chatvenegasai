// app/api/chat/route.js
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";        // or 'edge' if you prefer
export const dynamic = "force-dynamic"; // never pre-render/collect page data
export const revalidate = 0;            // no ISR

const SYSTEM_PROMPT = `
You are a normal ChatGPT-style assistant. Be clear, accurate, and concise.
Answer directly unless the input is an image command (handled server-side).
`.trim();

const isImageCmd = (t = "") => /^\/img\s+/i.test(t.trim());

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Throw to short-circuit; caught below and returned as 500
    throw new Error("Missing OPENAI_API_KEY");
  }
  // Lazy init — only at request time
  return new OpenAI({ apiKey });
}

export async function POST(req) {
  let payload = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ reply: "Invalid request body." }, { status: 400 });
  }

  const { content = "", history = [] } = payload;
  const text = String(content || "").trim();

  try {
    const openai = getOpenAI();

    // 1) Image generation: /img your prompt...
    if (isImageCmd(text)) {
      const prompt = text.replace(/^\/img\s+/i, "").trim();
      if (!prompt) {
        return NextResponse.json({ reply: "Give me something to draw after /img." });
      }

      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });

      const url = img?.data?.[0]?.url || "";
      if (!url) {
        return NextResponse.json({ reply: "Image service returned nothing." }, { status: 502 });
      }
      return NextResponse.json({ reply: `Image: ${prompt}`, imageUrl: url });
    }

    // 2) Normal chat path
    const shortHistory = (history || []).slice(-8).map((m) => ({
      role: m.role === "assistant" || m.role === "system" ? m.role : "user",
      content: String(m.content ?? ""),
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...shortHistory,
        { role: "user", content: text },
      ],
    });

    const reply = (completion.choices?.[0]?.message?.content || "Noted.").trim();
    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e?.message || "Chat service error. Try again.";
    const status = msg.includes("OPENAI_API_KEY") ? 500 : 502;
    return NextResponse.json({ reply: msg }, { status });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: "gpt-5", images: true });
}
