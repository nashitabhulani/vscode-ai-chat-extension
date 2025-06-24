import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { Uri } from 'vscode';
console.log("Loaded API KEY:", process.env.OPENROUTER_API_KEY);

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('aiChat.openChat', () => {
      const panel = vscode.window.createWebviewPanel(
        'aiChat',
        'AI Chat Assistant',
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, 'media'))
          ]
        }
      );

      const indexPath = path.join(context.extensionPath, 'media', 'index.html');
      let html = fs.readFileSync(indexPath, 'utf8');

      html = html.replace(/(src|href)="(.+?)"/g, (_match, attr, src) => {
        const assetPath = vscode.Uri.file(path.join(context.extensionPath, 'media', src));
        const webviewUri = panel.webview.asWebviewUri(assetPath);
        return `${attr}="${webviewUri}"`;
      });

      panel.webview.html = html;

      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
          case 'chat':
            const reply = await callOpenAI(message.text);
            panel.webview.postMessage({ type: 'reply', text: reply });
            break;

          case 'fileRequest':
            for (const filename of message.files) {
              try {
                
                const workspaceUri = vscode.workspace.workspaceFolders?.[0].uri;
                const fileUri = vscode.Uri.joinPath(workspaceUri!, ...filename.split(/[\\/]/));
                const fileBuffer = await vscode.workspace.fs.readFile(fileUri);
                const ext = path.extname(filename).toLowerCase();
                const isText = /\.(txt|js|ts|tsx|md|html|css|json)$/i.test(ext);
             const content = isText
  ? new TextDecoder('utf-8').decode(fileBuffer)
  : `[Binary File: ${filename}]`;

                panel.webview.postMessage({
                  type: 'fileContent',
                  filename,
                  content,
                });
              } catch {
                panel.webview.postMessage({
                  type: 'error',
                  text: `Could not read ${filename}`,
                });
              }
            }
            break;
        }
      });
    })
  );
}


async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
   if (!apiKey) {
  return '❌ OpenAI API key not set';
}

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/nashitabhulani/vscode-ai-chat-extension', // optional, for tracking
      'X-Title': 'VSCode Chat Extension' // optional
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct',

      messages: [{ role: 'user', content: prompt }]
    })
  });

  const json = await res.json();

  if (json.error) {
    console.error(json.error);
    return `❌ Error: ${json.error.message || 'Unknown error'}`;
  }

  return json.choices?.[0]?.message?.content || 'No reply received.';
}

