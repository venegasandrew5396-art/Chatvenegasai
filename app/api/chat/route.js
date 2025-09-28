import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// A strict system prompt that keeps answers short and execution-focused.
const SYSTEM_PROMPT = `
You are a ruthless, concise AI. Follow instructions precisely.
- Answer directly in 1–3 sentences.
- If the user requests an action that you cannot perform (needs external tools, file access, or real-world execution), say so plainly and provide the exact text/command they could run themselves.
- No apologies. No motivational filler. No extra suggestions unless explicitly asked.
- If the user gives constraints or a format, obey them exactly.
`.trim();

export async function POST(req) {
  const { content = "", history = [] } = await req.json().catch(() => ({ content: "", history: [] }));

  // Build a small context window (last few turns) to "listen & execute better"
  const shortHistory = history.slice(-6).map((m) => ({
    role: m.role === "assistant" || m.role === "system" ? m.role : "user",
    content: String(m.content ?? "")
  }));

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      temperature: 0.2,           // crisp and obedient
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...shortHistory,
        { role: "user", content }
      ],
    });

    const reply = (completion.choices?.[0]?.message?.content || "Noted.").trim();
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ reply: "Upstream error. Try later." });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: "gpt-5" });
}
