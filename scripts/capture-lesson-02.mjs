import { chromium } from "playwright";

const outDir = process.argv[2];
const baseUrl = process.argv[3] || "http://localhost:3100";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });

await page.goto(`${baseUrl}/agent`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/01-agent-empty.png` });

const textarea = page.locator("textarea");
await textarea.fill("");
await textarea.type("หาหนังสือ Go ราคาไม่เกิน 500 บาท", { delay: 20 });
await page.screenshot({ path: `${outDir}/02-agent-typed.png` });

await page.getByRole("button", { name: /ask agent/i }).click();
await page.waitForSelector("text=signature valid", { timeout: 5000 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/03-agent-mandate.png` });

await browser.close();
console.log("done");
