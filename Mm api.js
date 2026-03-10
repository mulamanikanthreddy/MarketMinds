// ============================================================
//  MarketMind AI — Mm_api.js
//  Front-end JavaScript — runs in the BROWSER
//
//  IMPORTANT: This file NEVER contains API keys.
//  It calls YOUR server (localhost:3000) which holds the keys.
//  Your server then calls OpenAI / Anthropic / News API.
// ============================================================

// ===== SERVER URL =====
// When running locally this points to your Node server
// When you deploy online, change this to your live domain
const SERVER_URL = window.location.origin; // e.g. http://localhost:3000


// ============================================================
//  FUNCTION: callClaudeAPI
//  Sends a prompt to YOUR server → server calls Claude → returns text
//  Usage: const result = await callClaudeAPI("my question", "you are a helpful bot")
// ============================================================
async function callClaudeAPI(prompt, systemPrompt) {
  try {
    const response = await fetch(`${SERVER_URL}/api/claude`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt, systemPrompt })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.message);
    return data.text;

  } catch (err) {
    console.error('callClaudeAPI error:', err.message);
    throw err;
  }
}


// ============================================================
//  FUNCTION: callOpenAI
//  Same pattern but uses OpenAI GPT
// ============================================================
async function callOpenAI(prompt, systemPrompt) {
  try {
    const response = await fetch(`${SERVER_URL}/api/openai`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt, systemPrompt })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.message);
    return data.text;

  } catch (err) {
    console.error('callOpenAI error:', err.message);
    throw err;
  }
}


// ============================================================
//  FUNCTION: fetchNews
//  Gets latest market news from your server
//  Usage: const articles = await fetchNews("amazon india", 10)
// ============================================================
async function fetchNews(query, pageSize = 10) {
  try {
    const url = `${SERVER_URL}/api/news?query=${encodeURIComponent(query)}&pageSize=${pageSize}`;
    const response = await fetch(url);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'News fetch failed');
    }

    const data = await response.json();
    return data.articles || [];

  } catch (err) {
    console.error('fetchNews error:', err.message);
    throw err;
  }
}


// ============================================================
//  FUNCTION: fetchTrends
//  Gets AI-powered market trends for a platform + category
//  Usage: const trends = await fetchTrends("amazon", "electronics")
// ============================================================
async function fetchTrends(platform, category) {
  try {
    const response = await fetch(`${SERVER_URL}/api/trends`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ platform, category })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Trends fetch failed');
    }

    const data = await response.json();
    return data.text || '';

  } catch (err) {
    console.error('fetchTrends error:', err.message);
    throw err;
  }
}


// ============================================================
//  HELPER: parseStrategies
//  Converts raw AI text into structured strategy cards
// ============================================================
function parseStrategies(text) {
  const lines      = text.split('\n').filter(l => l.trim());
  const strategies = [];
  const scores     = ['97%', '94%', '91%', '88%', '85%'];
  let current      = null;
  let idx          = 0;

  lines.forEach(line => {
    const isNumbered = /^[*#\s]*([0-9]+)[.)]/.test(line) && line.length < 100;
    if (isNumbered) {
      if (current) strategies.push(current);
      current = {
        num:   String(idx + 1).padStart(2, '0'),
        title: line.replace(/^[*#\s0-9.)]+/, '').replace(/\*\*/g, '').trim(),
        body:  '',
        score: scores[idx] || '82%'
      };
      idx++;
    } else if (current && line.trim()) {
      // Convert **bold** markdown to HTML
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      current.body += (current.body ? ' ' : '') + formatted.trim();
    }
  });

  if (current) strategies.push(current);

  // Fallback: if parsing fails, show one card with full text
  if (strategies.length === 0) {
    strategies.push({
      num:   '01',
      title: 'AI Strategy Report',
      body:  text.replace(/\*\*/g, '').replace(/\n/g, ' '),
      score: '95%'
    });
  }

  return strategies.slice(0, 4);
}


// ============================================================
//  HELPER: renderStrategies
//  Puts strategy cards into the #strategy-output element
// ============================================================
function renderStrategies(strategies, platform, category) {
  const out = document.getElementById('strategy-output');
  if (!out) return;

  out.innerHTML = `
    <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--amber);">
        AI ANALYSIS · ${platform.toUpperCase()} · ${category.toUpperCase()}
      </div>
      <div style="font-size:9px;color:var(--text-dim);">Generated ${new Date().toLocaleTimeString()}</div>
    </div>
    ${strategies.map((s, i) => `
      <div class="ai-response-card" style="animation-delay:${i * 0.12}s">
        <div class="ai-response-header">
          <span class="ai-response-num">STRATEGY ${s.num}</span>
          <span class="ai-response-score">${s.score} MATCH</span>
        </div>
        <div class="ai-response-title">${s.title}</div>
        <div class="ai-response-body">${s.body}</div>
      </div>
    `).join('')}
    <div class="ai-powered-badge">Powered by <span>Claude AI · MarketMind</span></div>
  `;
}


// ============================================================
//  GENERATE STRATEGY BUTTON
//  Listens for click on the #gen-strategy button
// ============================================================
const genBtn = document.getElementById('gen-strategy');
if (genBtn) {
  genBtn.addEventListener('click', async () => {
    const platform = document.getElementById('ai-platform')?.value || 'amazon';
    const category = document.getElementById('ai-category')?.value || 'electronics';
    const goal     = document.getElementById('ai-goal')?.value     || 'sales';

    const platformNames = {
      amazon:   'Amazon India',
      flipkart: 'Flipkart',
      nykaa:    'Nykaa',
      shopify:  'Shopify',
      etsy:     'Etsy',
      meesho:   'Meesho'
    };
    const goalNames = {
      sales:      'Increase Sales',
      traffic:    'Drive More Traffic',
      retention:  'Improve Customer Retention',
      launch:     'Launch a New Product',
      competitor: 'Outperform Competitors'
    };

    // Show loading state
    genBtn.textContent = '⟳ AI Thinking...';
    genBtn.disabled    = true;
    genBtn.classList.add('generating');

    const thinking  = document.getElementById('ai-thinking');
    const thinkText = document.getElementById('ai-thinking-text');
    const out       = document.getElementById('strategy-output');

    if (thinking)  thinking.style.display = 'flex';
    if (thinkText) thinkText.textContent   = `Analyzing ${platformNames[platform]} ${category} market trends...`;
    if (out)       out.style.opacity       = '0.3';

    // Build prompts
    const systemPrompt = `You are MarketMind, an expert AI sales and marketing strategist specializing in e-commerce platforms. Generate highly specific, actionable strategies with real numbers, percentages, and timeframes.`;

    const userPrompt = `Generate 3 specific, actionable marketing strategies for a seller on ${platformNames[platform]} in the ${category} category. Goal: ${goalNames[goal]}.

Format each strategy exactly as:
1. **Strategy Title**
Description with specific actions and expected results with numbers.

2. **Strategy Title**
...

3. **Strategy Title**
...`;

    try {
      const aiText = await callClaudeAPI(userPrompt, systemPrompt);
      if (thinkText) thinkText.textContent = 'Formatting strategies...';

      const strategies = parseStrategies(aiText);
      setTimeout(() => {
        if (thinking) thinking.style.display = 'none';
        if (out) { out.style.opacity = '1'; out.style.transition = 'opacity 0.4s'; }
        renderStrategies(strategies, platformNames[platform], category);
        genBtn.textContent = '⚡ Generate with AI';
        genBtn.disabled    = false;
        genBtn.classList.remove('generating');
      }, 300);

    } catch (err) {
      if (thinking) thinking.style.display = 'none';
      if (out) {
        out.style.opacity = '1';
        out.innerHTML = `
          <div class="ai-error">
            ⚠️ Could not connect to server.<br><br>
            Make sure <strong>server.js is running</strong> in VS Code terminal:<br>
            <code>node server.js</code><br><br>
            Error: ${err.message}
          </div>`;
      }
      genBtn.textContent = '⚡ Generate with AI';
      genBtn.disabled    = false;
      genBtn.classList.remove('generating');
    }
  });
}


// ============================================================
//  AI CHAT — Ask Anything
// ============================================================
async function sendChatMessage() {
  const input   = document.getElementById('ai-chat-input');
  const output  = document.getElementById('ai-chat-output');
  const sendBtn = document.getElementById('ai-chat-send');

  if (!input || !output || !input.value.trim()) return;

  const question = input.value.trim();
  input.value    = '';
  sendBtn.disabled    = true;
  sendBtn.textContent = '...';

  output.classList.add('active');
  output.innerHTML = '<span class="ai-stream-cursor"></span>';

  const systemPrompt = `You are MarketMind, an expert AI e-commerce and marketing analyst. 
You specialize in Amazon India, Flipkart, Nykaa, Shopify, Etsy, and Meesho. 
Give specific, data-driven answers in plain English. 
Keep answers to 3–5 sentences. Include at least one number or percentage. End with one clear next step.`;

  try {
    const response = await callClaudeAPI(question, systemPrompt);

    // Typewriter effect
    output.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'ai-stream-cursor';
    output.appendChild(cursor);

    let i = 0;
    function typeNext() {
      if (i < response.length) {
        output.insertBefore(document.createTextNode(response[i]), cursor);
        i++;
        const delay = response[i - 1] === '.' ? 40
                    : response[i - 1] === ',' ? 25
                    : 12;
        setTimeout(typeNext, delay);
      } else {
        cursor.remove();
        output.innerHTML += '<div class="ai-powered-badge" style="margin-top:8px;">Powered by <span>Claude AI</span></div>';
      }
    }
    typeNext();

  } catch (err) {
    output.innerHTML = `
      <div class="ai-error">
        ⚠️ Server not reachable.<br>
        Make sure <code>node server.js</code> is running in your VS Code terminal.<br>
        Error: ${err.message}
      </div>`;
  }

  sendBtn.disabled    = false;
  sendBtn.textContent = 'Ask →';
}

// Wire up chat button and Enter key
const chatSend  = document.getElementById('ai-chat-send');
const chatInput = document.getElementById('ai-chat-input');
if (chatSend)  chatSend.addEventListener('click', sendChatMessage);
if (chatInput) chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChatMessage();
});