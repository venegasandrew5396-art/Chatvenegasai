"use client";
import { useRef, useState } from "react";

export default function ChatComposer({ onSend, onAttach, onClear }) {
  const [text, setText] = useState("");
  const fileRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    onSend(msg);
    setText("");
  };

  const openPicker = () => fileRef.current?.click();
  const onPicked = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onAttach(files);
    e.target.value = "";
  };

  return (
    <div className="chat-composer">
      <form className="composer-row" onSubmit={submit}>
        <button type="button" className="btn btn-icon" onClick={openPicker} aria-label="Add image">📎</button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden-file" onChange={onPicked} />
        <input
          className="chat-input"
          placeholder="Type something..."
          inputMode="text" autoComplete="off" autoCorrect="off" autoCapitalize="none" enterKeyHint="send"
          value={text} onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn" aria-label="Send" disabled={!text.trim()}>➤</button>
        <button type="button" className="btn btn-icon btn-ghost" onClick={onClear} aria-label="Clear chat">✖</button>
      </form>
    </div>
  );
}
