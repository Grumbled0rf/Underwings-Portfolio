import http from 'node:http';
import puppeteer from 'puppeteer';

const PORT = 3000;
const SHARED = process.env.SHARED_TOKEN || '';

const browserPromise = puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  headless: 'new',
});

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method !== 'POST' || req.url !== '/render') {
    res.writeHead(404); return res.end('Not found');
  }
  if (SHARED && req.headers['x-shared-token'] !== SHARED) {
    res.writeHead(401); return res.end('Unauthorized');
  }
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 5_000_000) { req.destroy(); }});
  req.on('end', async () => {
    try {
      const { html, format = 'A4' } = JSON.parse(raw);
      if (!html) { res.writeHead(400); return res.end('html required'); }
      const browser = await browserPromise;
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
      const pdf = await page.pdf({ format, printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }});
      await page.close();
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': pdf.length });
      res.end(pdf);
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: String(e) }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`pdf-render listening on ${PORT}`));
