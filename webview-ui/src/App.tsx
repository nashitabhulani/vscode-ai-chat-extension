import React, { useEffect, useState } from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import { markedHighlight } from "marked-highlight";
import "highlight.js/styles/github.css";

type VsCodeMessage =
  | { type: "chat"; text: string }
  | { type: "fileRequest"; files: string[] };

declare const acquireVsCodeApi: () => {
  postMessage: (msg: VsCodeMessage) => void;
};

const vscode = acquireVsCodeApi();

marked.use(
  markedHighlight({
    highlight: (code, lang) => hljs.highlightAuto(code, [lang]).value,
  })
);

type Message = {
  from: "user" | "ai" | "file";
  text: string;
  filename?: string;
};

const App: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = () => {
    if (!input.trim()) return;

    vscode.postMessage({ type: "chat", text: input });

    // Detect @filename and request content
    const matches = input.match(/@([\w.\-/\\]+)/g);
    if (matches) {
      const files = matches.map((f) => f.slice(1));
      vscode.postMessage({ type: "fileRequest", files });
    }

    setMessages((prev) => [...prev, { from: "user", text: input }]);
    setInput("");
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;

      if (msg.type === "reply") {
        setMessages((prev) => [...prev, { from: "ai", text: msg.text }]);
      } else if (msg.type === "fileContent") {
        setMessages((prev) => [
          ...prev,
          {
            from: "file",
            text: msg.content,
            filename: msg.filename,
          },
        ]);
      } else if (msg.type === "error") {
        setMessages((prev) => [
          ...prev,
          { from: "ai", text: `⚠️ ${msg.text}` },
        ]);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h2>VS Code AI Chat</h2>
      <div
        style={{
          height: "60vh",
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: "0.75rem" }}>
            <strong>
              {msg.from === "user"
                ? "You"
                : msg.from === "ai"
                ? "AI"
                : `📎 ${msg.filename}`}
            </strong>
            <div>
              {msg.from === "file" && (msg as any).isImage ? (
                <img
                  src={(msg as any).text}
                  alt={msg.filename}
                  style={{ maxWidth: "100%", maxHeight: 300 }}
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={{ flex: 1, padding: "0.5rem" }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI assistant... try @filename"
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default App;
