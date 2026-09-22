/**
 * Browser chat page for the free demo (no curl required).
 */

export const DEMO_CHAT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Codzure Agent Demo</title>
  <style>
    :root {
      --bg: #0f1a17;
      --panel: #16241f;
      --ink: #e8f2ec;
      --muted: #9bb5a8;
      --accent: #3dba7a;
      --neo: #4aa3ff;
      --nyumba: #e0a35a;
      --line: #2a3d35;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh;
      font-family: "Segoe UI", system-ui, sans-serif;
      background:
        radial-gradient(ellipse at top, #1a3329 0%, transparent 55%),
        var(--bg);
      color: var(--ink);
      display: flex; flex-direction: column;
    }
    header {
      padding: 1.25rem 1.25rem 0.75rem;
      border-bottom: 1px solid var(--line);
    }
    header h1 {
      margin: 0; font-size: 1.35rem; letter-spacing: 0.02em;
    }
    header p { margin: 0.35rem 0 0; color: var(--muted); font-size: 0.9rem; }
    .badge {
      display: inline-block; margin-top: 0.5rem;
      font-size: 0.75rem; padding: 0.2rem 0.5rem;
      border: 1px solid var(--line); border-radius: 4px; color: var(--accent);
    }
    main {
      flex: 1; display: flex; flex-direction: column;
      max-width: 720px; width: 100%; margin: 0 auto; padding: 1rem;
      gap: 0.75rem;
    }
    .products { display: flex; gap: 0.5rem; }
    .products button {
      flex: 1; padding: 0.65rem; border-radius: 8px; border: 1px solid var(--line);
      background: var(--panel); color: var(--ink); cursor: pointer; font-weight: 600;
    }
    .products button.active.neo { border-color: var(--neo); color: var(--neo); }
    .products button.active.nyumba { border-color: var(--nyumba); color: var(--nyumba); }
    #log {
      flex: 1; min-height: 280px; overflow-y: auto;
      background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
      padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
    }
    .msg { max-width: 92%; padding: 0.65rem 0.8rem; border-radius: 10px; white-space: pre-wrap; line-height: 1.4; font-size: 0.95rem; }
    .msg.user { align-self: flex-end; background: #243830; }
    .msg.bot { align-self: flex-start; background: #1b2a24; border: 1px solid var(--line); }
    .msg .meta { font-size: 0.7rem; color: var(--muted); margin-bottom: 0.25rem; }
    form {
      display: flex; gap: 0.5rem;
    }
    form input {
      flex: 1; padding: 0.8rem 0.9rem; border-radius: 8px;
      border: 1px solid var(--line); background: var(--panel); color: var(--ink);
      font-size: 1rem;
    }
    form button {
      padding: 0.8rem 1.1rem; border: none; border-radius: 8px;
      background: var(--accent); color: #062014; font-weight: 700; cursor: pointer;
    }
    form button:disabled { opacity: 0.5; cursor: wait; }
    .hints { color: var(--muted); font-size: 0.8rem; }
    .hints code { color: var(--ink); }
  </style>
</head>
<body>
  <header>
    <h1>Codzure Agent</h1>
    <p>Free demo — Neo sales &amp; Nyumba listings (stub data, no paid API).</p>
    <span class="badge" id="mode">checking…</span>
  </header>
  <main>
    <div class="products">
      <button type="button" class="neo active" data-product="neo">Neo</button>
      <button type="button" class="nyumba" data-product="nyumba">Nyumba Zetu</button>
    </div>
    <p class="hints" id="hints"></p>
    <div id="log" aria-live="polite"></div>
    <form id="chat">
      <input id="message" autocomplete="off" placeholder="Type a message…" />
      <button type="submit" id="send">Send</button>
    </form>
  </main>
  <script>
    const hints = {
      neo: 'Try: <code>sold 3 bags cement to Mary 1500</code> then confirm the draft id',
      nyumba: 'Try: <code>find 2 bedroom places in Westlands under 100000 near Sarit</code>'
    };
    let product = 'neo';
    let sessionId = 'web-' + Math.random().toString(36).slice(2, 10);
    const log = document.getElementById('log');
    const hintsEl = document.getElementById('hints');
    const modeEl = document.getElementById('mode');
    hintsEl.innerHTML = hints.neo;

    document.querySelectorAll('.products button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.products button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        product = btn.dataset.product;
        hintsEl.innerHTML = hints[product];
        sessionId = 'web-' + Math.random().toString(36).slice(2, 10);
        add('bot', 'Switched to ' + (product === 'neo' ? 'Neo' : 'Nyumba Zetu') + '. New session.');
      });
    });

    function add(role, text) {
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = role === 'user' ? 'You' : 'Agent';
      div.appendChild(meta);
      div.appendChild(document.createTextNode(text));
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    fetch('/agent/health').then((r) => r.json()).then((h) => {
      modeEl.textContent = h.demoMode ? 'demoMode: free offline' : 'LLM mode';
    }).catch(() => { modeEl.textContent = 'offline?'; });

    add('bot', 'Hi — pick Neo or Nyumba, then send a message.');

    document.getElementById('chat').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('message');
      const send = document.getElementById('send');
      const message = input.value.trim();
      if (!message) return;
      add('user', message);
      input.value = '';
      send.disabled = true;
      try {
        const res = await fetch('/agent/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            product,
            userId: 'web-demo',
            sessionId
          })
        });
        const data = await res.json();
        if (!res.ok) {
          add('bot', data.error || JSON.stringify(data));
        } else {
          add('bot', data.reply || JSON.stringify(data, null, 2));
        }
      } catch (err) {
        add('bot', 'Request failed: ' + err.message);
      } finally {
        send.disabled = false;
        input.focus();
      }
    });
  </script>
</body>
</html>
`;
