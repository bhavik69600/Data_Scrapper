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

const USE_SERPAPI = String(process.env.USE_SERPAPI || 'true').toLowerCase() === 'true';
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const PORT = process.env.PORT || 5055;
const SCRAPE_EMAILS = String(process.env.SCRAPE_EMAILS || 'true').toLowerCase() === 'true';
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 200);

if (!SERPAPI_KEY || SERPAPI_KEY.includes('YOUR_SERPAPI_KEY')) {
  console.warn('⚠️ Set SERPAPI_KEY in .env before running.');
}

function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

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

app.post('/api/run', async (req, res) => {
  try {
    const { keywords, location } = req.body || {};
    if (!Array.isArray(keywords) || !location) {
      return res.status(400).json({ error: 'keywords (array) and location (string) are required.' });
    }
    if (!USE_SERPAPI) {
      return res.status(400).json({ error: 'This build is SerpAPI-only. Set USE_SERPAPI=true.' });
    }

    const cleanKeywords = keywords
      .map(k => String(k||'').trim())
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

    res.json({ rows: final });
  } catch (e) {
    console.error('API RUN ERROR:', e.response?.data || e.message || e);
    res.status(500).json({ error: e.response?.data?.error || e.message || 'Internal error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ SerpAPI Places Scraper UI running on http://localhost:${PORT}`);
});