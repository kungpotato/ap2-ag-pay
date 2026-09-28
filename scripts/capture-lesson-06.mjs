import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const outDir = process.argv[2];
const baseUrl = process.argv[3] || "http://localhost:3100";
const verifierBin = process.argv[4] || "/tmp/ap2-verifier";

function startVerifier() {
  const proc = spawn(verifierBin, [], { stdio: "ignore" });
  return proc;
}

async function waitForVerifierDown() {
  for (let i = 0; i < 20; i++) {
    try {
      await fetch("http://localhost:8787/health");
      await sleep(100);
    } catch {
      return;
    }
  }
}

async function waitForVerifierUp() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch("http://localhost:8787/health");
      if (res.ok) return;
    } catch {
      /* keep retrying */
    }
    await sleep(100);
  }
  throw new Error("verifier did not come up in time");
}

let verifier = startVerifier();
await waitForVerifierUp();

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

// 1. Kill the verifier and prove the payment fails closed, not silently.
verifier.kill();
await waitForVerifierDown();

await page.getByRole("button", { name: /^6\. pay with stripe/i }).click();
await page.waitForSelector("text=verifier service unreachable", { timeout: 10000 });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/01-verifier-down-fails-closed.png` });

// 2. Bring the verifier back, then show the tamper-and-pay rejection.
verifier = startVerifier();
await waitForVerifierUp();

await page.getByRole("button", { name: /ทดสอบ tamper แล้วจ่ายเงิน/i }).click();
await page.waitForSelector("text=separate process", { timeout: 10000 });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/02-tamper-pay-rejected.png` });

// 3. Real payment goes through once the verifier is up and everything is valid.
await page.getByRole("button", { name: /^6\. pay with stripe/i }).click();
await page.waitForSelector("text=Payment Mandate", { timeout: 15000 });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/03-payment-succeeded.png` });

await browser.close();
verifier.kill();
console.log("done");
