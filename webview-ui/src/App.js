import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import { markedHighlight } from "marked-highlight";
import "highlight.js/styles/github.css";
const vscode = acquireVsCodeApi();
marked.use(markedHighlight({
    highlight: (code, lang) => hljs.highlightAuto(code, [lang]).value,
}));
const App = () => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const sendMessage = () => {
        if (!input.trim())
            return;
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
        const handleMessage = (event) => {
            const msg = event.data;
            if (msg.type === "reply") {
                setMessages((prev) => [...prev, { from: "ai", text: msg.text }]);
            }
            else if (msg.type === "fileContent") {
                setMessages((prev) => [
                    ...prev,
                    {
                        from: "file",
                        text: msg.content,
                        filename: msg.filename,
                    },
                ]);
            }
            else if (msg.type === "error") {
                setMessages((prev) => [
                    ...prev,
                    { from: "ai", text: `⚠️ ${msg.text}` },
                ]);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);
    return (_jsxs("div", { style: { padding: "1rem", fontFamily: "sans-serif" }, children: [_jsx("h2", { children: "VS Code AI Chat" }), _jsx("div", { style: {
                    height: "60vh",
                    overflowY: "auto",
                    border: "1px solid #ccc",
                    padding: "0.5rem",
                    marginBottom: "1rem",
                }, children: messages.map((msg, idx) => (_jsxs("div", { style: { marginBottom: "0.75rem" }, children: [_jsx("strong", { children: msg.from === "user"
                                ? "You"
                                : msg.from === "ai"
                                    ? "AI"
                                    : `📎 ${msg.filename}` }), _jsx("div", { dangerouslySetInnerHTML: { __html: marked.parse(msg.text) } })] }, idx))) }), _jsxs("div", { style: { display: "flex", gap: "0.5rem" }, children: [_jsx("input", { style: { flex: 1, padding: "0.5rem" }, value: input, onChange: (e) => setInput(e.target.value), placeholder: "Ask your AI assistant... try @filename" }), _jsx("button", { onClick: sendMessage, children: "Send" })] })] }));
};
export default App;
