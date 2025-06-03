import type { VitestPuppeteerGlobal } from "vitest-environment-puppeteer";

declare global {
  // eslint-disable-next-line no-var
  var page: VitestPuppeteerGlobal["page"];
}
