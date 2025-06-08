import puppeteer from 'puppeteer';
import fs from 'fs';

const SESSION_PATH = './session.json';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  if (fs.existsSync(SESSION_PATH)) {
    const sessionData = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf-8'));
    await page.setCookie(...sessionData);
  }

  await page.goto('https://eqn.hsc.gov.ua/');

  await page.waitForSelector('input[type="checkbox"]');
  await page.click('input[type="checkbox"]');
  await page.click('button');

  console.log('🔑 Пройди авторизацію через BankID (відкрито у браузері)...');

  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('h6')).some((el) =>
        el.textContent.includes('Записатись у чергу')
      ),
    { timeout: 120000 }
  );

  console.log('✅ Авторизовано! Зберігаємо сесію...');

  const cookies = await page.cookies();
  fs.writeFileSync(SESSION_PATH, JSON.stringify(cookies, null, 2));

  await browser.close();
})();
