// app/page.jsx
"use client";
import { useState, useRef, useEffect } from "react";
import ChatComposer from "../components/ChatComposer";

export default function Page() {
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    try { scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); } catch {}
  }, [messages]);

  const fetchWithTimeout = async (input, init, ms = 15000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(t);
    }
  };

  const callChat = async (content, history, tryNum = 1) => {
    try {
      console.log("CHAT →", { content, historyLen: history.length, tryNum });
      const res = await fetchWithTimeout("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, history })
      }, 15000);

      console.log("CHAT status:", res.status);
      const data = await res.json().catch(() => ({ reply: "Bad JSON from server." }));
      console.log("CHAT data:", data);
      return data;
    } catch (e) {
      console.warn("CHAT fail:", e?.name || e);
      if (tryNum < 2) return callChat(content, history, tryNum + 1); // one retry
      return { reply: "Network timeout. Try again." };
    }
  };

  const onSend = async (text) => {
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);

    const data = await callChat(text, next);
    setSending(false);

    setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
  };

  const onAttach = (files) => {
    const names = files.map((f) => f.name).join(", ");
    setMessages((m) => [...m, { role: "user", content: `[attached: ${names}]` }]);
  };

  const onClear = () => setMessages([]);

  return (
    <div className="chat-page">
      <main className="chat-scroll" ref={scrollRef}>
        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "user" : "bot"}`}>
              {m.content}
            </div>
          ))}
          {sending && (
            <div className="msg bot">…</div>
          )}
        </div>
      </main>
      <ChatComposer onSend={onSend} onAttach={onAttach} onClear={onClear} />
    </div>
  );
}
