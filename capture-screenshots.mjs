import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const launchOptions = fs.existsSync(edgePath)
  ? { executablePath: edgePath, headless: 'new', defaultViewport: { width: 1440, height: 900 } }
  : { headless: 'new', defaultViewport: { width: 1440, height: 900 } };

async function capture() {
  console.log('Launching browser to capture screenshots...');
  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // 1. Dashboard Preview
  console.log('Capturing dashboard-preview.png...');
  await page.screenshot({ path: path.join('public', 'screenshots', 'dashboard-preview.png') });

  // 2. Grandma Mode
  console.log('Toggling Grandma Mode & capturing grandma-mode.png...');
  await page.evaluate(() => {
    window.__webmcp.executeAction('TOGGLE_GRANDMA_MODE', {});
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join('public', 'screenshots', 'grandma-mode.png') });

  // Reset Grandma Mode
  await page.evaluate(() => {
    window.__webmcp.executeAction('TOGGLE_GRANDMA_MODE', {});
  });
  await new Promise(r => setTimeout(r, 400));

  // 3. Agent Activity Inspector
  console.log('Running test agent actions & capturing agent-inspector.png...');
  await page.evaluate(async () => {
    // Query catalog
    await window.__webmcp.queryCatalog('Phase', 'ai-edge');
    // Autofill RFQ
    await window.__webmcp.executeAction('AUTOFILL_FORM', {
      customerName: 'Dr. Gordon Freeman',
      email: 'g.freeman@blackmesa.gov',
      company: 'Black Mesa Research Facility',
      urgencyLevel: 'emergency',
      notes: 'Severe 3.5 Hz vibration detected on Sector C cooling turbopump.',
      itemId: 'prod-001'
    });
  });

  // Open Inspector Drawer (click the Terminal icon button)
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const terminalBtn = buttons.find(b => b.getAttribute('title')?.includes('Agent Activity Inspector') || b.querySelector('svg.lucide-terminal'));
    if (terminalBtn) terminalBtn.click();
  });

  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join('public', 'screenshots', 'agent-inspector.png') });

  await browser.close();
  console.log('All screenshots captured successfully in public/screenshots/');
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
