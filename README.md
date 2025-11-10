# Places Scraper UI — SerpAPI Edition (No Google Billing Needed)

This build uses **SerpAPI (Google Maps engine)** to fetch local business results, then (optionally) scrapes emails from each business website.
No Google Cloud billing is required — just a **SerpAPI key**.

## Features
- Enter multiple **keywords** + a **location** (e.g., “Ahmedabad”)
- Uses **SerpAPI → engine=google_maps** to get listings (name, address, phone, website)
- Optional **homepage email extraction**
- Pretty UI, CSV export
- Simple Express backend (keeps your API key private)

## Quick Start
1) Unzip → open folder `places-scraper-serpapi/`
2) Copy `.env.sample` → `.env` and set your key:
```
SERPAPI_KEY=YOUR_SERPAPI_KEY
PORT=5055
SCRAPE_EMAILS=true
REQUEST_DELAY_MS=200
```
3) Install & run:
```bash
npm install
npm start
```
4) Open: http://localhost:5055

## Notes
- Free SerpAPI plan includes some credits; upgrade if needed.
- Respect target sites' robots.txt and terms when scraping emails.
- If you want to add back Google Places later, keep both keys and toggle with `USE_SERPAPI` in `.env`.