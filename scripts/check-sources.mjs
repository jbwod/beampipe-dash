import { chromium } from "@playwright/test";

const baseUrl = process.env.BEAMPIPE_DASH_URL ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(`${baseUrl}/sources`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "J103729-261901", exact: true }).waitFor();

  await page.getByRole("button", { name: "Register", exact: true }).click();
  const registrationDialog = page.getByRole("dialog");
  assert(await registrationDialog.getByLabel("Project").inputValue() === "wallaby_hires", "project does not default after project data loads");
  await registrationDialog.getByLabel("Source identifiers").fill("J111111-111111\nJ222222-222222\nJ111111-111111");
  await page.getByText("2 unique sources").waitFor();
  const registerResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/api/beampipe/sources/bulk"));
  await page.getByRole("button", { name: "Register sources" }).click();
  assert((await registerResponse).ok(), "bulk registration failed");
  await page.getByText("2 sources registered").waitFor();

  await page.getByLabel("Select J103729-261901").click();
  await page.getByLabel("Select J104059-270456").click();
  await page.getByText("2 selected / 4 visible").waitFor();
  await page.getByRole("button", { name: "Discover selected" }).click();
  const discoverResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/api/beampipe/sources/discover"));
  await page.getByRole("button", { name: "Mark for discovery" }).click();
  assert((await discoverResponse).ok(), "selected rediscovery failed");
  await page.getByText("2 sources marked for discovery").waitFor();

  await page.getByRole("button", { name: "Run workflow admission" }).click();
  const admissionResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/beampipe/jobs"));
  await page.getByRole("button", { name: "Run admission" }).click();
  assert((await admissionResponse).ok(), "manual execution admission failed");
  await page.getByText("execution admission requested for wallaby_hires").waitFor();

  await page.getByRole("link", { name: "J103729-261901", exact: true }).click();
  await page.getByText("all readiness gates pass").waitFor();
  await page.getByText("SBID 59122").click();
  await page.getByText("ASKAP-59122.ms").waitFor();
  await page.getByRole("tab", { name: /Runs \/ 3/ }).click();
  await page.getByRole("link", { name: /019b37af/ }).first().waitFor();
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByLabel("Stale after (hours)").fill("48");
  const patchResponse = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/beampipe/sources/"));
  await page.getByRole("button", { name: "Save source" }).click();
  assert((await patchResponse).ok(), "source policy update failed");

  await page.getByRole("button", { name: "Rediscover" }).click();
  await page.getByRole("tab", { name: /Metadata/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert(!overflow, "source explorer overflows mobile viewport");

  if (errors.length) throw new Error(`browser errors: ${errors.join("; ")}`);
  console.log("sources: register, select, discover, admission, readiness, metadata, runs, settings / ok");
} finally {
  await browser.close();
}

function assert(value, message) {
  if (!value) throw new Error(message);
}
