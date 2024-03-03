require("dotenv").config();
import * as puppeteer from "puppeteer";
import _set from "lodash/set";

// TODO: singleton
export class PuppeteerAdapter {
  private browser: puppeteer.Browser | null = null;

  constructor() { }

  initBrowser = async () => {
    this.browser = await puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS?.toLowerCase() !== "false", // false for debugging
      slowMo: 50,
    });
    return this.browser;
  };

  closeBrowser = async () => {
    if (this.browser) {
      this.browser.close();
      this.browser = null;
    }
  };

  goToPage = async (url: string, existingPage?: puppeteer.Page) => {
    let browser = this.browser;
    if (!browser) {
      browser = await this.initBrowser();
    }

    let page = existingPage || (await browser.newPage());

    // method 1: close all existing pages, then open a new one
    // const existingPages = await browser.pages();
    // existingPages.map((page) => page.close());
    // const page = await browser.newPage();

    // method 2: reuse the existing page
    // const [page] = await browser.pages();

    await page.goto(url, { waitUntil: "networkidle2" });
    return page;
  };

  closePage = async (page: puppeteer.Page) => {
    await page.close();
  };
}
