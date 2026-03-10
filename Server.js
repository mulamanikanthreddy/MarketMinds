// ============================================================
//  MarketMind AI — server.js
//  Complete back-end server for the MarketMind application
//
//  HOW TO RUN:
//    1. Make sure Node.js is installed (nodejs.org)
//    2. Run:  npm install express dotenv cors node-fetch
//    3. Create a .env file in the same folder (see below)
//    4. Run:  node server.js
//    5. Open: http://localhost:3000
//
//  YOUR .env FILE SHOULD LOOK LIKE THIS:
//    OPENAI_KEY=sk-proj-your-openai-key-here
//    ANTHROPIC_KEY=sk-ant-your-anthropic-key-here
//    NEWS_KEY=your-news-api-key-here
//    PORT=3000
// ============================================================

// ===== IMPORTS =====
// These are the tools/libraries our server uses
const express  = require('express');   // Web server framework
const cors     = require('cors');      // Allows browser to talk to server
const path     = require('path');      // Helps with file paths
require('dotenv').config();            // Loads your .env secret keys

const app  = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
// Middleware runs on EVERY request before it reaches your routes
app.use(cors());                            // Allow cross-origin requests
app.use(express.json());                    // Parse incoming JSON body
app.use(express.static(__dirname));      // Serve ALL files in the same folder as server.js


// ============================================================
//  ROUTE: HOME PAGE
//  When someone visits http://localhost:3000 they get login.html
// ============================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketmind.html'));
});


// ============================================================
//  ROUTE: CLAUDE AI — Generate Marketing Strategy
//  Front-end calls: POST /api/claude
//  Body: { prompt: "...", systemPrompt: "..." }
// ============================================================
app.post('/api/claude', async (req, res) => {
  // 1. Get the prompt sent from the browser
  const { prompt, systemPrompt } = req.body;

  // 2. Validate — make sure something was sent
  if (!prompt) {
    return res.status(400).json({ error: true, message: 'No prompt provided.' });
  }

  // 3. Check that the API key exists in .env
  if (!process.env.ANTHROPIC_KEY) {
    return res.status(500).json({ error: true, message: 'ANTHROPIC_KEY is missing from your .env file.' });
  }

  try {
    // 4. Call the Anthropic API from the SERVER (key stays secret)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            process.env.ANTHROPIC_KEY,  // Secret key from .env
        'anthropic-version':    '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system:     systemPrompt || 'You are a helpful marketing assistant.',
        messages:   [{ role: 'user', content: prompt }]
      })
    });

    // 5. Check if Anthropic returned an error
    if (!response.ok) {
      const errData = await response.json();
      console.error('Anthropic API error:', errData);
      return res.status(response.status).json({
        error:   true,
        message: errData?.error?.message || 'Anthropic API error.'
      });
    }

    // 6. Get the AI response and send it back to the browser
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return res.json({ success: true, text });

  } catch (err) {
    console.error('Server error (Claude):', err.message);
    return res.status(500).json({ error: true, message: 'Server error calling Claude API.' });
  }
});


// ============================================================
//  ROUTE: OPENAI — Alternative AI Generation
//  Front-end calls: POST /api/openai
//  Body: { prompt: "...", systemPrompt: "..." }
// ============================================================
app.post('/api/openai', async (req, res) => {
  const { prompt, systemPrompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: true, message: 'No prompt provided.' });
  }

  if (!process.env.OPENAI_KEY) {
    return res.status(500).json({ error: true, message: 'OPENAI_KEY is missing from your .env file.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`  // Secret key from .env
      },
      body: JSON.stringify({
        model:    'gpt-4o-mini',  // Cost-effective model — change to gpt-4o for better results
        messages: [
          { role: 'system',  content: systemPrompt || 'You are a helpful marketing assistant.' },
          { role: 'user',    content: prompt }
        ],
        max_tokens:  1024,
        temperature: 0.7   // 0 = very consistent, 1 = more creative
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('OpenAI API error:', errData);
      return res.status(response.status).json({
        error:   true,
        message: errData?.error?.message || 'OpenAI API error.'
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return res.json({ success: true, text });

  } catch (err) {
    console.error('Server error (OpenAI):', err.message);
    return res.status(500).json({ error: true, message: 'Server error calling OpenAI API.' });
  }
});


// ============================================================
//  ROUTE: NEWS API — Fetch Market News
//  Front-end calls: GET /api/news?query=amazon+india&category=business
//  Returns latest news articles for the given search query
// ============================================================
app.get('/api/news', async (req, res) => {
  // Get search query from URL e.g. /api/news?query=amazon
  const query    = req.query.query    || 'ecommerce india';
  const category = req.query.category || 'business';
  const pageSize = req.query.pageSize || 10;

  if (!process.env.NEWS_KEY) {
    return res.status(500).json({ error: true, message: 'NEWS_KEY is missing from your .env file.' });
  }

  try {
    // Build the News API URL
    const newsUrl = `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(query)}&` +
      `language=en&` +
      `sortBy=publishedAt&` +
      `pageSize=${pageSize}&` +
      `apiKey=${process.env.NEWS_KEY}`;

    const response = await fetch(newsUrl);

    if (!response.ok) {
      const errData = await response.json();
      return res.status(response.status).json({
        error:   true,
        message: errData?.message || 'News API error.'
      });
    }

    const data = await response.json();

    // Clean up the articles — only send what the front-end needs
    const articles = (data.articles || []).map(article => ({
      title:       article.title,
      description: article.description,
      url:         article.url,
      source:      article.source?.name,
      publishedAt: article.publishedAt,
      urlToImage:  article.urlToImage
    }));

    return res.json({ success: true, articles, totalResults: data.totalResults });

  } catch (err) {
    console.error('Server error (News):', err.message);
    return res.status(500).json({ error: true, message: 'Server error fetching news.' });
  }
});


// ============================================================
//  ROUTE: MARKET TRENDS — Combine AI + News for Trend Analysis
//  Front-end calls: POST /api/trends
//  Body: { platform: "amazon", category: "electronics" }
// ============================================================
app.post('/api/trends', async (req, res) => {
  const { platform, category } = req.body;

  if (!platform || !category) {
    return res.status(400).json({ error: true, message: 'Platform and category are required.' });
  }

  try {
    // Step 1: Get relevant news
    const newsQuery  = `${platform} ${category} market trend India 2025`;
    const newsUrl    = `https://newsapi.org/v2/everything?q=${encodeURIComponent(newsQuery)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_KEY}`;
    let newsHeadlines = '';

    if (process.env.NEWS_KEY) {
      const newsRes  = await fetch(newsUrl);
      const newsData = await newsRes.json();
      newsHeadlines  = (newsData.articles || [])
        .slice(0, 5)
        .map(a => `- ${a.title}`)
        .join('\n');
    }

    // Step 2: Ask Claude to analyze the trends
    const prompt = `Based on these recent news headlines about ${platform} ${category} market:
${newsHeadlines || '(No live news available — use your knowledge)'}

Give me 3 current market trends for ${category} sellers on ${platform} in India.
For each trend: name it, explain it in 2 sentences, and give one action to capitalize on it now.
Format: numbered list, bold trend name.`;

    const systemPrompt = `You are MarketMind, an expert e-commerce market analyst for Indian platforms. Be specific, data-driven, and practical.`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiResponse.json();
    const text   = aiData.content?.[0]?.text || 'Could not generate trends.';

    return res.json({ success: true, text, newsHeadlines });

  } catch (err) {
    console.error('Server error (Trends):', err.message);
    return res.status(500).json({ error: true, message: 'Error generating trends.' });
  }
});


// ============================================================
//  ROUTE: HEALTH CHECK
//  Visit http://localhost:3000/api/health to verify server is running
//  and which API keys are properly configured
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status:  'MarketMind server is running ✓',
    port:    PORT,
    keys: {
      anthropic: process.env.ANTHROPIC_KEY ? '✓ Loaded'  : '✗ MISSING — add ANTHROPIC_KEY to .env',
      openai:    process.env.OPENAI_KEY    ? '✓ Loaded'  : '✗ MISSING — add OPENAI_KEY to .env',
      news:      process.env.NEWS_KEY      ? '✓ Loaded'  : '✗ MISSING — add NEWS_KEY to .env'
    }
  });
});


// ============================================================
//  CATCH-ALL: Any unknown route returns a helpful message
// ============================================================
app.get('/marketmind-main.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketmind.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketmind.html'));
});


// ============================================================
//  START THE SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        MarketMind AI — Server            ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Running at: http://localhost:${PORT}         ║`);
  console.log(`║  Health:     http://localhost:${PORT}/api/health ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  API Keys Status:                        ║');
  console.log(`║  Anthropic : ${process.env.ANTHROPIC_KEY ? '✓ Loaded              ' : '✗ MISSING from .env   '}║`);
  console.log(`║  OpenAI    : ${process.env.OPENAI_KEY    ? '✓ Loaded              ' : '✗ MISSING from .env   '}║`);
  console.log(`║  News API  : ${process.env.NEWS_KEY      ? '✓ Loaded              ' : '✗ MISSING from .env   '}║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});