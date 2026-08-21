import { chromium } from "@playwright/test";
import { confirmMutatingE2E } from "./confirm-e2e.mjs";

confirmMutatingE2E();

const baseUrl = process.env.BEAMPIPE_DASH_URL ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(`${baseUrl}/runs/new?project=wallaby_hires&sources=J103729-261901%2CJ104059-270456`, { waitUntil: "domcontentloaded" });
  await page.getByText(/2 selected \/ \d+ loaded/).waitFor();
  assert((await page.getByLabel("Deployment profile").inputValue()).includes("019b37af-c000"), "default project profile was not pinned");

  let prepareResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/beampipe/executions/prepare"));
  await page.getByRole("button", { name: "Validate selection" }).click();
  assert((await prepareResponse).ok(), "valid preparation request failed");
  await page.getByText("4", { exact: true }).first().waitFor();
  assert(await page.getByRole("button", { name: "Create + start" }).isEnabled(), "valid prepared run cannot be created");

  await page.getByText("J100102-270112", { exact: true }).click();
  assert(await page.getByRole("button", { name: "Create + start" }).isDisabled(), "changing sources did not invalidate preparation");
  prepareResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/beampipe/executions/prepare"));
  await page.getByRole("button", { name: "Validate selection" }).click();
  assert((await prepareResponse).ok(), "blocked preparation request failed at transport level");
  await page.getByText(/Discovery is still in progress/).waitFor();
  assert(await page.getByRole("button", { name: "Create + start" }).isDisabled(), "blocked preparation can be submitted");

  await page.getByText("J100102-270112", { exact: true }).click();
  prepareResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/beampipe/executions/prepare"));
  await page.getByRole("button", { name: "Validate selection" }).click();
  await prepareResponse;
  await page.getByRole("button", { name: "Create + start" }).waitFor();

  const createResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/beampipe/executions"));
  const executeResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && /\/api\/beampipe\/executions\/[^/]+\/execute$/.test(response.url()));
  await page.getByRole("button", { name: "Create + start" }).click();
  const createResponse = await createResponsePromise;
  const createPayload = createResponse.request().postDataJSON();
  assert(createResponse.status() === 201, `execution create returned ${createResponse.status()}`);
  assert(createPayload.sources.length === 2, "execution create did not retain both sources");
  assert(createPayload.deployment_profile_id === "019b37af-c000-7000-8000-000000000001", "execution was not pinned to the selected profile");
  const executeResponse = await executeResponsePromise;
  const executePayload = executeResponse.request().postDataJSON();
  assert(executeResponse.status() === 202, `execution start returned ${executeResponse.status()}`);
  assert(executePayload.do_stage === true && executePayload.do_submit === true, "execution start options changed");
  await page.waitForURL(/\/runs\/019b37af-4f6c-7d7a-9a73-555555555555$/);
  await page.getByText("Execution ledger").waitFor();

  if (errors.length) throw new Error(`browser errors: ${errors.join("; ")}`);
  console.log("run composer: multiple sources, valid + blocked prepare, profile pin, create + start / ok");
} finally {
  await browser.close();
}

function assert(value, message) {
  if (!value) throw new Error(message);
}
