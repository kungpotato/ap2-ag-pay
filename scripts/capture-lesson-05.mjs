import { chromium } from "playwright";

const outDir = process.argv[2];
const baseUrl = process.argv[3] || "http://localhost:3100";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });

await page.goto(`${baseUrl}/agent`);
await page.waitForTimeout(300);

const textarea = page.locator("textarea");
await textarea.fill("");
await textarea.type("หาหนังสือ Go ราคาไม่เกิน 500 บาท", { delay: 15 });
await page.getByRole("button", { name: /^ask agent$/i }).click();
await page.waitForSelector("text=signature valid", { timeout: 15000 });

await page.getByRole("button", { name: /build cart/i }).click();
await page.waitForSelector("text=Cart Mandate", { timeout: 10000 });

await page.getByRole("button", { name: /approve & authorize/i }).click();
await page.waitForSelector("text=Cart Approval", { timeout: 10000 });
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/01-ready-to-pay.png` });

await page.getByRole("button", { name: /pay with stripe/i }).click();
await page.waitForSelector("text=Payment Mandate", { timeout: 15000 });
await page.waitForTimeout(300);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/02-payment-succeeded.png` });

await browser.close();
console.log("done");
