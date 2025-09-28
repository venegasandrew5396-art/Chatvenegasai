// app/api/chat/route.js
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are a normal ChatGPT-style assistant. Be clear, accurate, and concise.
Answer directly unless the input is an image command (handled server-side).
`.trim();

const isImageCmd = (t = "") => /^\/img\s+/i.test(t.trim());

export async function POST(req) {
  let payload = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ reply: "Invalid request body." }, { status: 400 });
  }

  const { content = "", history = [] } = payload;
  const text = String(content || "").trim();

  // 1) Image generation path: /img prompt...
  if (isImageCmd(text)) {
    const prompt = text.replace(/^\/img\s+/i, "").trim();
    if (!prompt) {
      return NextResponse.json({ reply: "Give me something to draw after /img." });
    }

    try {
      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024"
      });

      const url = img?.data?.[0]?.url || "";
      if (!url) {
        return NextResponse.json({ reply: "Image service returned nothing." });
      }
      // send an image-specific payload
      return NextResponse.json({ reply: `Image: ${prompt}`, imageUrl: url });
    } catch (e) {
      const msg = e?.message || "image error";
      return NextResponse.json({ reply: `Image generation failed: ${msg}` });
    }
  }

  // 2) Normal chat path
  try {
    const shortHistory = (history || []).slice(-8).map((m) => ({
      role: m.role === "assistant" || m.role === "system" ? m.role : "user",
      content: String(m.content ?? "")
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...shortHistory,
        { role: "user", content: text }
      ],
    });

    const reply = (completion.choices?.[0]?.message?.content || "Noted.").trim();
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ reply: "Chat service error. Try again." });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: "gpt-5", images: true });
}
