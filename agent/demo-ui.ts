/**
 * Browser chat page — Codzure branding + free weak-local agent.
 */

export const DEMO_CHAT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Codzure Agent · Neo &amp; Nyumba</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <style>
    :root {
      --sky: #39B6FF;
      --paper: #EAF1FB;
      --ink: #1A1F24;
      --muted: #59626D;
      --white: #FFFFFF;
      --line: #D7E4F5;
      --neo: #39B6FF;
      --nyumba: #2F6FED;
      --soft: #F8FBFF;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh;
      font-family: "DM Sans", system-ui, sans-serif;
      color: var(--ink);
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, #cfe9ff 0%, transparent 55%),
        linear-gradient(180deg, var(--paper) 0%, var(--white) 45%, #f3f8ff 100%);
      display: flex; flex-direction: column;
    }
    header {
      padding: 1rem 1.25rem 0.85rem;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,0.82);
      backdrop-filter: blur(10px);
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.85rem 1.25rem;
    }
    .brand {
      display: flex; align-items: center; gap: 0.75rem; min-width: 0;
    }
    .brand img {
      height: 42px; width: auto; display: block;
    }
    .brand-copy { min-width: 0; }
    .brand-copy strong {
      display: block; font-size: 0.72rem; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--sky); font-weight: 700;
    }
    .brand-copy h1 {
      margin: 0.1rem 0 0;
      font-family: "Instrument Serif", Georgia, serif;
      font-weight: 400; font-size: 1.45rem; line-height: 1.1;
    }
    .badge {
      margin-left: auto;
      font-size: 0.75rem; padding: 0.35rem 0.65rem;
      border-radius: 999px; border: 1px solid var(--line);
      background: var(--soft); color: var(--muted);
    }
    main {
      flex: 1; display: flex; flex-direction: column;
      max-width: 760px; width: 100%; margin: 0 auto; padding: 1rem;
      gap: 0.75rem;
    }
    .products { display: flex; gap: 0.5rem; }
    .products button {
      flex: 1; padding: 0.7rem; border-radius: 12px; border: 1px solid var(--line);
      background: var(--white); color: var(--ink); cursor: pointer; font-weight: 600;
      font-family: inherit;
    }
    .products button.active.neo { border-color: var(--neo); color: var(--neo); box-shadow: 0 0 0 3px rgba(57,182,255,0.15); }
    .products button.active.nyumba { border-color: var(--nyumba); color: var(--nyumba); box-shadow: 0 0 0 3px rgba(47,111,237,0.12); }
    #log {
      flex: 1; min-height: 300px; overflow-y: auto;
      background: var(--white); border: 1px solid var(--line); border-radius: 16px;
      padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
      box-shadow: 0 10px 30px rgba(26, 31, 36, 0.04);
    }
    .msg { max-width: 92%; padding: 0.7rem 0.85rem; border-radius: 14px; white-space: pre-wrap; line-height: 1.45; font-size: 0.95rem; }
    .msg.user { align-self: flex-end; background: #e8f6ff; border: 1px solid #c5e7ff; }
    .msg.bot { align-self: flex-start; background: var(--soft); border: 1px solid var(--line); }
    .msg .meta { font-size: 0.7rem; color: var(--muted); margin-bottom: 0.25rem; font-weight: 600; }
    form { display: flex; gap: 0.5rem; }
    form input {
      flex: 1; padding: 0.85rem 1rem; border-radius: 12px;
      border: 1px solid var(--line); background: var(--white); color: var(--ink);
      font-size: 1rem; font-family: inherit;
    }
    form input:focus { outline: 2px solid rgba(57,182,255,0.35); border-color: var(--sky); }
    form button {
      padding: 0.85rem 1.15rem; border: none; border-radius: 12px;
      background: var(--sky); color: #fff; font-weight: 700; cursor: pointer;
      font-family: inherit;
    }
    form button:disabled { opacity: 0.55; cursor: wait; }
    .hints { color: var(--muted); font-size: 0.82rem; margin: 0; }
    .hints code { color: var(--ink); background: #eef5ff; padding: 0.1rem 0.35rem; border-radius: 4px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <img src="/agent/assets/codzure_logo_full.png" alt="Codzure Solutions" />
      <div class="brand-copy">
        <strong>Codzure Solutions</strong>
        <h1>Ask Neo &amp; Nyumba</h1>
      </div>
    </div>
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
      <input id="message" autocomplete="off" placeholder="Ask to search or record a sale…" />
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
        add('bot', 'Switched to ' + (product === 'neo' ? 'Neo' : 'Nyumba Zetu') + '. Ask me anything for this product.');
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
      modeEl.textContent = (h.llm || 'local') + (h.demoMode ? ' · free' : '');
    }).catch(() => { modeEl.textContent = 'offline?'; });

    add('bot', 'Hi — I am the Codzure agent. Pick Neo (sales) or Nyumba (property search), then send a message.');

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
          body: JSON.stringify({ message, product, userId: 'web-demo', sessionId })
        });
        const data = await res.json();
        if (!res.ok) add('bot', data.error || JSON.stringify(data));
        else add('bot', data.reply || JSON.stringify(data, null, 2));
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
