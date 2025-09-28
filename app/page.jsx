"use client";
import { useState, useRef, useEffect } from "react";
import ChatComposer from "../components/ChatComposer";

export default function Page() {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  const scrollToBottom = () => {
    try { scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); } catch {}
  };
  useEffect(scrollToBottom, [messages]);

  const onSend = async (text) => {
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: text, history: next }),
    });
    const data = await res.json().catch(() => ({ reply: "Error. Try again." }));
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
        </div>
      </main>
      <ChatComposer onSend={onSend} onAttach={onAttach} onClear={onClear} />
    </div>
  );
}
