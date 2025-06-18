import type { VitestPuppeteerGlobal } from "vitest-environment-puppeteer";

declare global {
  var page: VitestPuppeteerGlobal["page"];
}
