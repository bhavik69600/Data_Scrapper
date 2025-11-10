const runBtn = document.getElementById('run');
const exportBtn = document.getElementById('export');
const kwEl = document.getElementById('keywords');
const locEl = document.getElementById('location');
const scrapeEl = document.getElementById('scrape');
const tableBody = document.querySelector('#resultTable tbody');
const progress = document.getElementById('progress');
const bar = document.getElementById('bar');
const status = document.getElementById('status');

let currentRows = [];

function setProgress(pct, text) {
  bar.style.width = pct + '%';
  status.textContent = text || '';
}

function toCSV(arr) {
  const rows = [
    ['keyword','name','address','phone','website','emails'],
    ...arr.map(o => [
      o.keyword || '',
      o.name || '',
      o.address || '',
      o.phone || '',
      o.website || '',
      (o.emails || []).join(';')
    ])
  ];
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderTable(rows) {
  tableBody.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.keyword || ''}</td>
      <td>${r.name || ''}</td>
      <td>${r.address || ''}</td>
      <td>${r.phone || ''}</td>
      <td>${r.website ? `<a href="${r.website}" target="_blank" rel="noopener">link</a>` : ''}</td>
      <td>${(r.emails || []).join('<br>')}</td>
    `;
    tableBody.appendChild(tr);
  }
}

runBtn.addEventListener('click', async () => {
  const keywords = kwEl.value.split('\n').map(s => s.trim()).filter(Boolean);
  const location = locEl.value.trim();
  const scrape = scrapeEl.value === 'true';

  if (!keywords.length || !location) {
    alert('Please provide keywords and location.');
    return;
  }

  currentRows = [];
  renderTable(currentRows);
  exportBtn.disabled = true;
  progress.hidden = false;
  setProgress(3, 'Contacting server…');

  try {
    const resp = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, location, scrape })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Request failed');

    setProgress(70, 'Processing results…');
    currentRows = (data && data.rows) || [];
    renderTable(currentRows);
    setProgress(100, `Done. ${currentRows.length} rows.`);
    exportBtn.disabled = currentRows.length === 0;
  } catch (e) {
    console.error(e);
    alert('Error: ' + e.message);
    setProgress(0, 'Error.');
  } finally {
    setTimeout(()=>{ progress.hidden = true; }, 800);
  }
});

exportBtn.addEventListener('click', () => {
  if (!currentRows.length) return;
  const csv = toCSV(currentRows);
  download('places_results.csv', csv);
});
