import { chromium } from "@playwright/test";
import { confirmMutatingE2E } from "./confirm-e2e.mjs";

confirmMutatingE2E();

const baseUrl = process.env.BEAMPIPE_DASH_URL ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
  permissions: ["clipboard-read", "clipboard-write"],
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(10_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("dialog", (dialog) => dialog.accept());

try {
await page.goto(`${baseUrl}/projects/new?project=wallaby_hires`, { waitUntil: "domcontentloaded" });
await page.getByLabel("Project ID").waitFor();
await page.getByLabel("Description").fill("Interactive dashboard demo");

await page.getByRole("button", { name: "Copy YAML" }).click();
let yamlText = await page.evaluate(() => navigator.clipboard.readText());
assert(yamlText.includes("id: wallaby_hires"), "loaded project ID is missing from YAML");
assert(yamlText.includes("description: Interactive dashboard demo"), "visual description did not reach YAML");

await page.getByRole("tab", { name: "Discovery", exact: true }).click();
await page.getByRole("button", { name: "Add query", exact: true }).click();
await page.getByRole("button", { name: "Copy YAML" }).click();
yamlText = await page.evaluate(() => navigator.clipboard.readText());
assert(yamlText.includes("name: query_3"), "new config-defined query did not reach YAML");

await page.getByRole("tab", { name: "Graph + manifest" }).click();
assert(await page.getByRole("link", { name: /Open graph in EAGLE/ }).count() === 1, "EAGLE graph link is missing");

const saveResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/api/beampipe/project-configs"));
await page.getByRole("button", { name: "Save version" }).click();
const saveResponse = await saveResponsePromise;
if (!saveResponse.ok()) throw new Error(`save failed (${saveResponse.status()}): ${await saveResponse.text()}`);
await page.getByText("Mock project revision accepted").waitFor();

const replacement = `apiVersion: beampipe.dev/v2
kind: ProjectConfig
metadata:
  id: yaml_roundtrip
  description: Written in YAML
adapters:
  required: [casda]
  tap:
    timeout_seconds: 45
    retries: 1
discovery:
  queries: []
  enrichments: []
graph_patches: []
automation: {}
`;
const editor = page.locator(".cm-content");
await editor.click();
await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
await page.keyboard.insertText(replacement);
await page.getByRole("tab", { name: "Identity + TAP" }).click();
await page.waitForFunction(() => [...document.querySelectorAll("label")].find((label) => label.textContent?.includes("Project ID"))?.querySelector("input")?.value === "yaml_roundtrip");
assert(await page.getByLabel("Description").inputValue() === "Written in YAML", "YAML description did not reach visual editor");
assert(await page.getByLabel("Timeout (seconds)").inputValue() === "45", "YAML TAP timeout did not reach visual editor");

if (errors.length) throw new Error(`browser errors: ${errors.join("; ")}`);
console.log("project studio interactions: visual <-> YAML, query editor, EAGLE link, save / ok");
} finally {
  await browser.close();
}

function assert(value, message) {
  if (!value) throw new Error(message);
}
