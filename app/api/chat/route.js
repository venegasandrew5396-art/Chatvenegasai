import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are ChatGPT-style assistant. Behave better than ChatGPT Pro:
- Answer normally in clear, full sentences.
- Respect context and follow instructions exactly.
- No unnecessary fluff. No broken persona.
- Clarify only when needed. Otherwise answer directly.
`.trim();

export async function POST(req) {
  const { content = "", history = [] } = await req.json().catch(() => ({ content: "", history: [] }));

  // build short history
  const shortHistory = history.slice(-8).map((m) => ({
    role: m.role === "assistant" || m.role === "system" ? m.role : "user",
    content: String(m.content ?? "")
  }));

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...shortHistory,
        { role: "user", content }
      ],
    });

    const reply = (completion.choices?.[0]?.message?.content || "Noted.").trim();
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ reply: "Error contacting GPT-5. Check your key." });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: "gpt-5" });
}
