import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const targetUrl = process.env.GUI_URL ?? "http://127.0.0.1:5177/";
const apiUrl = process.env.GUI_API_URL ?? "http://127.0.0.1:4177";
const screenshotDir = path.resolve("artifacts", "screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });

async function readJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

const health = await readJson(`${apiUrl}/api/health`);
if (health.ok !== true) throw new Error(`API health check failed: ${JSON.stringify(health)}`);

const apiSnapshot = await readJson(`${apiUrl}/api/snapshot`);
const portfolio = apiSnapshot.portfolio as { projectCount?: number; taskCount?: number } | undefined;
if (apiSnapshot.scannerVersion === "harness-gui-fixture/1") throw new Error("API returned synthetic fixture data");
if (!portfolio?.projectCount || !portfolio.taskCount) throw new Error(`API returned empty scan: ${JSON.stringify(apiSnapshot)}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

const snapshotResponse = () => page.waitForResponse((response) => response.url().includes("/api/snapshot") && response.ok(), { timeout: 15_000 });

const initialSnapshot = snapshotResponse();
await page.goto(targetUrl, { waitUntil: "networkidle" });
await page.getByText("Coding Agent Harness").first().waitFor({ timeout: 15_000 });
await page.evaluate(() => localStorage.clear());
await initialSnapshot;
const reloadedSnapshot = snapshotResponse();
await page.reload({ waitUntil: "networkidle" });
await page.getByText("Coding Agent Harness").first().waitFor({ timeout: 15_000 });
const browserSnapshot = await (await reloadedSnapshot).json() as Record<string, unknown>;
const browserPortfolio = browserSnapshot.portfolio as { projectCount?: number; taskCount?: number } | undefined;
if (browserSnapshot.scannerVersion === "harness-gui-fixture/1") throw new Error("Browser app loaded synthetic fixture data");
if (!browserPortfolio?.projectCount || !browserPortfolio.taskCount) throw new Error(`Browser app loaded empty scan: ${JSON.stringify(browserSnapshot)}`);

const resizeBefore = await page.evaluate(() => document.querySelector(".console-shell > section")!.getBoundingClientRect().width);
const queueResizer = await page.getByRole("button", { name: "Resize queue panel" }).boundingBox();
if (!queueResizer) throw new Error("Queue resizer was not visible");
await page.mouse.move(queueResizer.x + queueResizer.width / 2, queueResizer.y + queueResizer.height / 2);
await page.mouse.down();
await page.mouse.move(queueResizer.x + 90, queueResizer.y + queueResizer.height / 2, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(100);
const resizeAfter = await page.evaluate(() => ({
  width: document.querySelector(".console-shell > section")!.getBoundingClientRect().width,
  stored: JSON.parse(localStorage.getItem("harness-gui-ui-preferences") ?? "{}") as { queuePanelWidth?: number }
}));
await page.reload({ waitUntil: "networkidle" });
await page.getByText("Coding Agent Harness").first().waitFor({ timeout: 15_000 });
const resizeReload = await page.evaluate(() => ({
  width: document.querySelector(".console-shell > section")!.getBoundingClientRect().width,
  stored: JSON.parse(localStorage.getItem("harness-gui-ui-preferences") ?? "{}") as { queuePanelWidth?: number }
}));

const desktopMetrics = await page.evaluate((resizeState) => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  railBg: getComputedStyle(document.querySelector("aside")!).backgroundColor,
  resizeBefore: resizeState.resizeBefore,
  resizeAfterWidth: resizeState.resizeAfter.width,
  resizeStoredWidth: resizeState.resizeAfter.stored.queuePanelWidth,
  resizeReloadWidth: resizeState.resizeReload.width,
  resizeReloadStoredWidth: resizeState.resizeReload.stored.queuePanelWidth,
  clippedChildren: Array.from(document.querySelector(".console-shell")!.children)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { tag: element.tagName, display: style.display, left: rect.left, right: rect.right, width: rect.width };
    })
    .filter((rect) => rect.display !== "none" && rect.width > 0 && (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1))
}), { resizeBefore, resizeAfter, resizeReload });

await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
await page.getByRole("dialog", { name: "Command palette" }).waitFor({ timeout: 5_000 });
await page.screenshot({ path: path.join(screenshotDir, "gui-ds-desktop.png"), fullPage: true });
await page.keyboard.press("Escape");

await page.getByText("Settings").click();
await page.getByText("Light").click();
await page.waitForTimeout(300);
const lightMetrics = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  railBg: getComputedStyle(document.querySelector("aside")!).backgroundColor
}));
await page.screenshot({ path: path.join(screenshotDir, "gui-ds-light.png"), fullPage: true });

await page.setViewportSize({ width: 1024, height: 900 });
await page.goto(targetUrl, { waitUntil: "networkidle" });
await page.getByText("Coding Agent Harness").first().waitFor({ timeout: 15_000 });
const tabletMetrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  shellDisplay: getComputedStyle(document.querySelector(".console-shell")!).display,
  clippedChildren: Array.from(document.querySelector(".console-shell")!.children)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { tag: element.tagName, display: style.display, left: rect.left, right: rect.right, width: rect.width };
    })
    .filter((rect) => rect.display !== "none" && rect.width > 0 && (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1))
}));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(targetUrl, { waitUntil: "networkidle" });
await page.getByText("Coding Agent Harness").first().waitFor({ timeout: 15_000 });
const mobileMetrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  shellDisplay: getComputedStyle(document.querySelector(".console-shell")!).display,
  clippedChildren: Array.from(document.querySelector(".console-shell")!.children)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { tag: element.tagName, display: style.display, left: rect.left, right: rect.right, width: rect.width };
    })
    .filter((rect) => rect.display !== "none" && rect.width > 0 && (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1))
}));
await page.screenshot({ path: path.join(screenshotDir, "gui-ds-mobile.png"), fullPage: true });

await browser.close();

const result = {
  targetUrl,
  apiUrl,
  apiMetrics: {
    scannerVersion: apiSnapshot.scannerVersion,
    projectCount: portfolio.projectCount,
    taskCount: portfolio.taskCount
  },
  desktopMetrics,
  lightMetrics,
  tabletMetrics,
  mobileMetrics,
  errors
};
console.log(JSON.stringify(result, null, 2));

if (errors.length) process.exit(2);
if (desktopMetrics.scrollWidth > desktopMetrics.clientWidth) process.exit(3);
if (desktopMetrics.clippedChildren.length) process.exit(6);
if ((desktopMetrics.resizeAfterWidth ?? 0) <= desktopMetrics.resizeBefore) process.exit(9);
if (!desktopMetrics.resizeStoredWidth || desktopMetrics.resizeStoredWidth <= 360) process.exit(10);
if (desktopMetrics.resizeReloadStoredWidth !== desktopMetrics.resizeStoredWidth) process.exit(11);
if (Math.abs(desktopMetrics.resizeReloadWidth - desktopMetrics.resizeAfterWidth) > 2) process.exit(12);
if (lightMetrics.theme !== "light") process.exit(4);
if (tabletMetrics.scrollWidth > tabletMetrics.clientWidth) process.exit(13);
if (tabletMetrics.shellDisplay !== "block") process.exit(14);
if (tabletMetrics.clippedChildren.length) process.exit(15);
if (mobileMetrics.hasHorizontalOverflow) process.exit(5);
if (mobileMetrics.shellDisplay !== "block") process.exit(7);
if (mobileMetrics.clippedChildren.length) process.exit(8);
