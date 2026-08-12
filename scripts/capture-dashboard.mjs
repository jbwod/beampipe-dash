import { chromium } from "@playwright/test";

const baseUrl = process.env.BEAMPIPE_DASH_URL ?? "http://127.0.0.1:3100";
const outputDir = process.env.BEAMPIPE_DASH_SCREENSHOT_DIR ?? "/private/tmp";
const expectedText = process.env.BEAMPIPE_DASH_EXPECT_TEXT;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const routes = (process.env.BEAMPIPE_DASH_ROUTES ?? "overview,runs,jobs,sources,projects,workers,system")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

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
    if (route.startsWith("projects/new?project=")) {
      const project = new URL(`${baseUrl}/${route}`).searchParams.get("project");
      await page.getByLabel("Project ID").waitFor();
      await page.waitForFunction((expected) => document.querySelector('input') && [...document.querySelectorAll('input')].some((input) => input.value === expected), project);
    }
    if (route === "sources") await page.waitForFunction(() => document.body.textContent?.includes("J103729-261901"));
    if (route.startsWith("sources/")) await page.getByText(/SBID /).first().waitFor();
    await page.waitForTimeout(250);
    const name = route.replace(/[^a-zA-Z0-9_-]+/g, "-");
    await page.screenshot({ path: `${outputDir}/beampipe-dash-${name}-${viewport.name}.png`, fullPage: false });
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
