import { chromium } from "@playwright/test";

const baseUrl = process.env.BEAMPIPE_DASH_URL ?? "http://127.0.0.1:3100";
const outputDir = process.env.BEAMPIPE_DASH_SCREENSHOT_DIR ?? "/private/tmp";
const expectedText = process.env.BEAMPIPE_DASH_EXPECT_TEXT;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const routes = ["overview", "runs", "jobs", "sources", "projects", "workers", "system"];

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${route}`, { waitUntil: "domcontentloaded" });
    await page.locator("h1").waitFor();
    if (route === "overview" && expectedText) await page.getByText(expectedText, { exact: true }).first().waitFor();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${outputDir}/beampipe-dash-${route}-${viewport.name}.png`, fullPage: false });
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyOverflow: document.body.scrollWidth > document.body.clientWidth,
    }));
    if (dimensions.bodyOverflow) {
      throw new Error(`${route} overflows ${viewport.name}: ${JSON.stringify(dimensions)}`);
    }
    if (errors.length) throw new Error(`${route} raised browser errors: ${errors.join("; ")}`);
    console.log(`${route}/${viewport.name}: ${JSON.stringify(dimensions)}`);
    await page.close();
  }
}

await browser.close();
