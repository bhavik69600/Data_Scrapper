require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { fetchEmailsFromWebsite } = require('./utils/scrape');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/', express.static(path.join(__dirname, 'frontend')));

// Environment Variables
const USE_SERPAPI = String(process.env.USE_SERPAPI || 'true').toLowerCase() === 'true';
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const PORT = process.env.PORT || 5055;
const SCRAPE_EMAILS = String(process.env.SCRAPE_EMAILS || 'true').toLowerCase() === 'true';
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 200);

if (!SERPAPI_KEY || SERPAPI_KEY.includes('YOUR_SERPAPI_KEY')) {
  console.warn('⚠️ Set SERPAPI_KEY in Railway Variables.');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function serpApiMapsSearch(query) {
  const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&hl=en&api_key=${SERPAPI_KEY}`;
  const { data } = await axios.get(url, { timeout: 20000 });
  const list = data.local_results || data.local_results_more || data.place_results || [];
  const arr = Array.isArray(list) ? list : [];
  return arr.map(r => ({
    name: r.title || r.name || '',
    address: r.address || r.formatted_address || '',
    phone: r.phone || '',
    website: r.website || '',
    place_id: r.place_id || r.cid || r.data_id || ''
  }));
}

// ✅ Same function, used by both POST /api/run and POST /api/scrape
async function handleScrape(keywords, location) {
  if (!Array.isArray(keywords) || !location) {
    throw new Error("keywords (array) and location (string) are required.");
  }

  const cleanKeywords = keywords
    .map(k => String(k || '').trim())
    .filter(Boolean)
    .slice(0, 60);

  const final = [];
  for (const kw of cleanKeywords) {
    const query = `${kw} in ${location}`;
    console.log('🔎 SerpAPI query:', query);
    const results = await serpApiMapsSearch(query);

    for (const r of results) {
      let emails = [];
      if (SCRAPE_EMAILS && r.website) {
        emails = await fetchEmailsFromWebsite(r.website);
        await delay(REQUEST_DELAY_MS);
      }
      final.push({
        keyword: kw,
        name: r.name,
        address: r.address,
        phone: r.phone,
        website: r.website,
        emails
      });
    }
    await delay(REQUEST_DELAY_MS);
  }

  return final;
}

// ✅ FRONTEND CALLS THIS (POST)
app.post('/api/scrape', async (req, res) => {
  try {
    const rows = await handleScrape(req.body.keywords, req.body.location);
    res.json({ rows });
  } catch (e) {
    console.error('API /scrape ERROR:', e.message);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// ✅ TEST IN BROWSER (GET)
app.get('/api/scrape', async (req, res) => {
  try {
    const query = req.query.query;   // "starbucks ahmedabad"
    if (!query) return res.status(400).json({ error: "query required" });

    // keyword & location split krde
    const parts = query.split(" in ");
    const keyword = parts[0];
    const location = parts[1] || "";

    const rows = await handleScrape([keyword], location);
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// old route kept for compatibility
app.post('/api/run', async (req, res) => {
  try {
    const rows = await handleScrape(req.body.keywords, req.body.location);
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend live on http://localhost:${PORT}`);
});
