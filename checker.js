import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import notifier from 'node-notifier';
import dotenv from 'dotenv';

dotenv.config();

const SESSION_PATH = './session.json';
const CHECK_INTERVAL = 5 * 1000;
const CENTER_CODE = process.env.CENTER_CODE;

async function clickButtonByText(page, text) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const btnText = await page.evaluate((el) => el.innerText.trim(), btn);
    if (btnText.includes(text)) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function checkSlots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

  try {
    try {
      const cookiesJSON = await fs.readFile(SESSION_PATH, 'utf-8');
      const cookies = JSON.parse(cookiesJSON);
      await page.setCookie(...cookies);
    } catch (e) {
      console.warn('⚠️ Cookies не знайдено або не зчитано.');
    }

    await page.goto('https://eqn.hsc.gov.ua/cabinet/queue', {
      waitUntil: 'networkidle2',
    });

    await page.waitForSelector('button');
    await clickButtonByText(page, 'Практичний іспит');

    await new Promise((res) => setTimeout(res, 500));
    await clickButtonByText(page, 'Сервісного центру МВС');

    await new Promise((res) => setTimeout(res, 500));
    await clickButtonByText(page, 'категорія В (механічна КПП)');

    await new Promise((res) => setTimeout(res, 500));
    const buttons = await page.$$('button');
    let found = false;

    for (const button of buttons) {
      const text = await page.evaluate((el) => el.innerText, button);

      if (text.includes(`${CENTER_CODE}`)) {
        const isDisabled = await page.evaluate((el) => el.disabled, button);

        if (!isDisabled) {
          console.log(`✅ Центр ${CENTER_CODE} доступний!`);
          notifier.notify({
            title: 'Є доступний центр!',
            message: `ТСЦ МВС № ${CENTER_CODE} активний.`,
          });
        } else {
          console.log(`❌ Центр ${CENTER_CODE} недоступний.`);
        }

        found = true;
        break;
      }
    }

    if (!found) {
      console.log(`❗ Кнопку з текстом ТСЦ МВС № ${CENTER_CODE} не знайдено.`);
    }
  } catch (err) {
    console.error('❗ Помилка під час перевірки:', err.message);
  } finally {
    await browser.close();
  }
}

checkSlots();
setInterval(checkSlots, CHECK_INTERVAL);
