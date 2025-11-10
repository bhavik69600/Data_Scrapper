const axios = require('axios');

async function fetchEmailsFromWebsite(url) {
  if (!url) return [];
  try {
    const resp = await axios.get(url, {
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PlacesScraper/1.0)' }
    });
    const html = resp.data || '';
    const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const unique = [...new Set(matches)];
    return unique.slice(0, 30);
  } catch (e) {
    return [];
  }
}

module.exports = { fetchEmailsFromWebsite };