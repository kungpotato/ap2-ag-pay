import { chromium } from "playwright";

const outDir = process.argv[2];
const baseUrl = process.argv[3] || "http://localhost:3100";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });

await page.goto(`${baseUrl}/agent`);
await page.waitForTimeout(300);

// Scenario 1 + 2: budget and expiry, shown together in the same panel.
await page.getByRole("button", { name: /งบไม่พอ/ }).click();
await page.waitForSelector("text=merchant ปฏิเสธ", { timeout: 30000 });
await page.getByRole("button", { name: /intent หมดอายุ/ }).click();
await page.waitForFunction(
  () => document.body.innerText.match(/merchant ปฏิเสธ/g)?.length >= 2,
  { timeout: 15000 }
);
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/01-budget-and-expiry-rejected.png` });

// Real flow up to approval, then a declined-card attempt before the real pay.
const textarea = page.locator("textarea");
await textarea.fill("");
await textarea.type("หาหนังสือ Go ราคาไม่เกิน 500 บาท", { delay: 15 });
await page.getByRole("button", { name: /^ask agent$/i }).click();
await page.waitForSelector("text=signature valid", { timeout: 30000 });

await page.getByRole("button", { name: /build cart/i }).click();
await page.waitForSelector("text=Cart Mandate", { timeout: 10000 });

await page.getByRole("button", { name: /approve & authorize/i }).click();
await page.waitForSelector("text=Cart Approval", { timeout: 10000 });

await page.getByRole("button", { name: /ทดสอบ card declined/i }).click();
await page.waitForSelector("text=Stripe ปฏิเสธ", { timeout: 10000 });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/02-card-declined.png` });

// Real payment, then simulate a dispute on the resulting order.
await page.getByRole("button", { name: /^6\. pay with stripe/i }).click();
await page.waitForSelector("text=Payment Mandate", { timeout: 15000 });
await page.waitForSelector("text=Order status", { timeout: 10000 });

await page.getByRole("button", { name: /จำลอง dispute/i }).click();
await page.waitForSelector("text=หลักฐาน AP2 mandate chain", { timeout: 10000 });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/03-disputed-with-evidence.png` });

await browser.close();
console.log("done");
