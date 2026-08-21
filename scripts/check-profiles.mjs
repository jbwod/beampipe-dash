import { chromium } from "@playwright/test";
import { confirmMutatingE2E } from "./confirm-e2e.mjs";

confirmMutatingE2E();

const baseUrl = process.env.BEAMPIPE_DASH_URL ?? "http://127.0.0.1:3100";
const outputDir = process.env.BEAMPIPE_DASH_SCREENSHOT_DIR ?? "/tmp";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("dialog", (dialog) => dialog.accept());

try {
  await page.goto(`${baseUrl}/profiles`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /setonix.*slurm remote/i }).click();
  await page.getByRole("tab", { name: "Slurm connection" }).click();
  assert(await page.getByLabel("Login node").inputValue() === "setonix.pawsey.org.au", "Slurm target did not hydrate");
  assert(await page.getByLabel("DALiuGE root").inputValue() === "/scratch/pawsey0411/beampipe/dlg", "remote DALiuGE path did not hydrate");

  await page.getByRole("tab", { name: "Resources" }).click();
  await page.getByLabel("Nodes", { exact: true }).fill("4");
  await page.getByText("unsaved changes").waitFor();
  const saveResponsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/beampipe/deployment-profiles/"));
  await page.getByRole("button", { name: "Save revision" }).click();
  const saveResponse = await saveResponsePromise;
  assert(saveResponse.ok(), `Slurm revision save failed: ${saveResponse.status()}`);
  await page.getByText(/revision 8/).waitFor();

  const slurmCheckPromise = page.waitForResponse((response) => response.url().includes("/api/beampipe/scheduler/status"));
  await page.getByRole("button", { name: "Test", exact: true }).click();
  assert((await slurmCheckPromise).ok(), "Slurm connectivity check failed");
  await page.getByText(/#SBATCH --partition=work/).waitFor();
  await page.getByText("configured", { exact: true }).first().waitFor();
  await page.screenshot({ path: `${outputDir}/beampipe-dash-profile-slurm-desktop.png`, fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${outputDir}/beampipe-dash-profile-slurm-mobile.png`, fullPage: false });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert(!overflow, "Slurm profile overflows the mobile viewport");
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("button", { name: /rest-local.*rest remote/i }).click();
  await page.getByRole("tab", { name: "REST endpoint" }).click();
  assert(await page.getByLabel("Deploy host").inputValue() === "host.docker.internal", "REST deploy target did not hydrate");
  const restCheckPromise = page.waitForResponse((response) => response.url().includes("/api/beampipe/daliuge/inspect"));
  await page.getByRole("button", { name: "Test", exact: true }).click();
  assert((await restCheckPromise).ok(), "REST connectivity check failed");
  await page.getByText('"sessions": 2').waitFor();

  await page.getByRole("button", { name: "New REST profile" }).click();
  assert(await page.getByLabel("Name").inputValue() === "rest-local", "new REST profile defaults are unavailable");
  assert(await page.getByRole("button", { name: "Create", exact: true }).isEnabled(), "valid new profile cannot be created");

  if (errors.length) throw new Error(`browser errors: ${errors.join("; ")}`);
  console.log("deployment profiles: REST + Slurm edit, revision, connectivity, runtime posture / ok");
} finally {
  await browser.close();
}

function assert(value, message) {
  if (!value) throw new Error(message);
}
