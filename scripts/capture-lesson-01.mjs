import { chromium } from "playwright";

const outDir = process.argv[2];
const baseUrl = process.argv[3] || "http://localhost:3100";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

await page.goto(baseUrl);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/01-catalog.png` });

await page.getByRole("link", { name: "Add to cart" }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/02-cart-one-item.png` });

await page.getByRole("link", { name: "Back to shop" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/03-catalog-again.png` });

await page.getByRole("link", { name: "Add to cart" }).nth(1).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/04-cart-two-items.png` });

await browser.close();
console.log("done");
