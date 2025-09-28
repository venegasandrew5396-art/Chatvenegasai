// app/api/chat/route.js
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are ChatGPT-style assistant. Behave like ChatGPT Pro:
- Answer normally in clear, full sentences.
- Respect context and follow instructions exactly.
- Clarify only when needed; otherwise answer directly.
`.trim();

function rid() { return Math.random().toString(36).slice(2, 10); } // request id

export async function POST(req) {
  const id = rid();
  const start = Date.now();

  let payload = {};
  try {
    payload = await req.json();
  } catch {
    console.error(`[chat:${id}] Bad JSON body`);
    return NextResponse.json({ reply: "Invalid request body." }, { status: 400 });
  }

  const { content = "", history = [] } = payload;
  console.log(`[chat:${id}] IN`, { content, historyLen: history?.length ?? 0 });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(history || []).slice(-8).map((m) => ({
          role: m.role === "assistant" || m.role === "system" ? m.role : "user",
          content: String(m.content ?? "")
        })),
        { role: "user", content }
      ],
    });

    const reply = (completion.choices?.[0]?.message?.content || "Noted.").trim();
    const ms = Date.now() - start;
    console.log(`[chat:${id}] OK in ${ms}ms`);
    return NextResponse.json({ reply });
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err?.message || String(err);
    console.error(`[chat:${id}] ERR in ${ms}ms →`, msg);
    const hint = process.env.OPENAI_API_KEY ? "key_present" : "missing_openai_key";
    return NextResponse.json({ reply: `Service error (${hint}).` }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: "gpt-5" });
}
