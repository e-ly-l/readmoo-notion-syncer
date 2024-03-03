import * as puppeteer from "puppeteer";
import { PuppeteerAdapter } from "../adapters/puppeteer";
import { CredentialService } from "./credential";
import { ReadmooCredentials } from "../types/credentials";
import { sleep, writeToFile } from "../utils/common";
import { ReadmooBook } from "../types";

const MAX_RETRY = 5;
const MAX_TIMEOUT = 10_000;

const waitOptions = { timeout: MAX_TIMEOUT };

const dialogHandler = async (dialog: puppeteer.Dialog) => {
  console.log(dialog.message());
  await dialog.accept();
};

type ReadmooScrapeOptions = {
  isExportToReadwise?: boolean;
};

export class ReadmooService {
  private puppeteer;
  private credentials: ReadmooCredentials;
  private notebooksUrl =
    "https://read.readmoo.com/#/history/highlights/readings";
  private notebooksPage: puppeteer.Page | null;
  private notebooksPageLoading: Promise<void> | null = null;

  constructor(credentials?: {
    email: string;
    password: string;
    readwiseToken: string;
  }) {
    if (credentials) {
      this.credentials = credentials;
    } else {
      const config = CredentialService.getInstance();
      this.credentials = config.getReadmooCredentials();
    }

    this.puppeteer = new PuppeteerAdapter();
    this.notebooksPage = null;
    this.notebooksPageLoading = this.goToNotebooksPage();
  }

  login = async (
    email: string,
    password: string,
    existingPage?: puppeteer.Page
  ) => {
    const loginUrl = "https://member.readmoo.com/login";

    const browser = this.puppeteer;

    let page = await browser.goToPage(loginUrl, existingPage);

    await page.waitForSelector("#login-form > div:nth-child(1) > input", {
      timeout: 3_000,
    });
    const emailInput = await page.$("#login-form > div:nth-child(1) > input");
    const passwordInput = await page.$(
      "#login-form > div:nth-child(2) > input"
    );

    if (!emailInput || !passwordInput) {
      throw new Error("login form not found");
    }

    await emailInput.type(email);
    await passwordInput.type(password);
    await page.click("#sign-in-btn");
    await sleep(500);

    console.log("logged in to Readmoo");
    return page;
  };

  goToNotebooksPage = async (): Promise<void> => {
    const notebooksUrl =
      this.notebooksUrl ||
      "https://read.readmoo.com/#/history/highlights/readings";

    const { email, password } = this.credentials;

    let arrived = false;
    let page = this.notebooksPage || (await this.login(email, password));
    do {
      try {
        await page.goto(notebooksUrl);
        await page.waitForSelector("div.highlights-container", waitOptions);

        this.notebooksPage = page;
        page.on("dialog", dialogHandler);

        console.log("arrived at notebooks page");
        arrived = true;
      } catch (e) {
        page = await this.login(email, password, page);
        console.log("retrying to arrive at notebooks page");
      }
    } while (!arrived);
  };

  getNotebooksPage = async (
    force: boolean = false
  ): Promise<puppeteer.Page> => {
    if (force || (!this.notebooksPageLoading && !this.notebooksPage)) {
      this.notebooksPageLoading = this.goToNotebooksPage();
    }

    if (this.notebooksPageLoading) {
      await this.notebooksPageLoading;
      this.notebooksPageLoading = null;
    }

    await this.notebooksPage?.goto(this.notebooksUrl);
    return this.notebooksPage!;
  };

  destroy = async () => {
    if (this.notebooksPage) {
      await this.puppeteer.closePage(this.notebooksPage);
    }

    if (this.puppeteer) {
      // await this.puppeteer.closeBrowser(); // don't close the browser if multiple services are using it
    }

  }

  scrapeBooksInfo = async () => {
    const page = await this.getNotebooksPage();
    const books = await page.$$(".reading-item");

    const promises = books.map(async (book) => {
      const image = await book.$("div.cover > img");
      const cover = await image?.evaluate((img) => img.getAttribute("src")); // all are '/images/openbook.png'
      const title = await image?.evaluate((img) => img.getAttribute("alt"));

      const highlightCountText = await book.$eval(
        ".highlight-count",
        (el) => el.textContent
      );
      const highlightCount =
        (highlightCountText ? highlightCountText.match(/\d+/)?.[0] : "0") ||
        "0";

      return { title, cover_url: cover, highlightsCount: +highlightCount };
    });

    const booksInfo = await Promise.all(promises);
    const booksMap: { [title: string]: { annotationsCount: { highlightsCount: number } } } = {};
    booksInfo.forEach((book) => {
      booksMap[book.title!] = {
        annotationsCount: {
          highlightsCount: book.highlightsCount,
        }
      }
    });

    return booksMap;
  };

  scrapeHighlights = async (
    bookTitle: string,
    { isExportToReadwise = true }: ReadmooScrapeOptions
  ) => {
    const page = await this.getNotebooksPage();
    const books = await page.$$(".reading-item");

    let promises = books.map(async (book) => {
      const title = await book.$eval("div.cover > img", (img) =>
        img.getAttribute("alt")
      );
      if (title === bookTitle) return book;
      return null;
    });
    const results = await Promise.all(promises);
    const targetBook = results.find((book) => book !== null) || null;
    if (!targetBook) {
      throw new Error(`Book with title ${bookTitle} not found`);
    }

    await targetBook.click();

    const highlights = await ReadmooService.parseBookHighlights(page);
    if (isExportToReadwise) await ReadmooService.exportToReadwise(page);

    return highlights;
  };

  scrapeBooksHighlights = async ({
    isExportToReadwise = true,
  }: ReadmooScrapeOptions = {}): Promise<ReadmooBook[]> => {
    const booksInfo = await this.scrapeBooksInfo();

    const booksHighlights = {} as any;
    let count = 0;
    for (const title of Object.keys(booksInfo)) {
      console.log(
        "scraping book",
        ++count,
        "of",
        Object.keys(booksInfo).length
      );
      console.log("Book title:", title);

      let retry = 0
      do {
        try {
          const highlights = await this.scrapeHighlights(title, {
            isExportToReadwise,
          });

          booksHighlights[title] = {
            ...booksInfo[title],
            ...highlights,
          };
          break;
        } catch {
          console.log("Book not found, retrying...")
        }
      } while (retry < MAX_RETRY)
    }

    // console.log(booksHighlights);
    return Object.values(booksHighlights);
  };

  static parseBookHighlights = async (highlightPage: puppeteer.Page): Promise<ReadmooBook> => {
    await highlightPage.waitForSelector("div.highlights-item-container");

    const bookInfo = await highlightPage.$eval(
      "div.highlights-item-container > div:nth-child(1)",
      (el) => {
        const title =
          el.querySelector("div:nth-child(2) > div")?.textContent || "";
        const cover =
          el.querySelector("div:nth-child(1) > img")?.getAttribute("src") || "";
        return { title, cover };
      }
    );

    const highlights = await highlightPage.$$eval(".highlight-item", (els) => {
      return els.map((el) => {
        const cls = el.getAttribute("class")?.split(" ") || [];
        const color = cls.length > 1 ? cls[1] : "yellow";
        const highlight =
          el.querySelector("div.highlight-content > span")?.textContent || "";
        const note =
          el.querySelector("span.highlight-annoatation")?.textContent || "";
        return { color, highlight, note };
      });
    });

    // console.log(bookInfo);
    // console.log(highlights);

    return {
      ...bookInfo,
      annotationsCount: {
        highlightsCount: highlights.length,
        notesCount: highlights.filter((h) => h.note).filter(v => v).length,
      },
      annotations: highlights,
    };
  };

  static exportToReadwise = async (highlightPage: puppeteer.Page) => {
    console.log("exporting to readwise");

    let retry = 0;
    do {
      try {
        const exportItem = await highlightPage.$(
          "#react-container > div > div > div.row.no-gutters > div.col-sm-10 > section > div.desktop-top-nav > div > div > div > span:nth-child(5)"
        );
        await exportItem?.click();

        await highlightPage.waitForSelector(
          "body > div.fade.export-highlight-modal.modal.show > div > div > div.list-group.list-group-flush > button:nth-child(12)",
          waitOptions
        );

        await highlightPage.click(
          "body > div.fade.export-highlight-modal.modal.show > div > div > div.list-group.list-group-flush > button:nth-child(12)"
        );

        const tokenInput = await highlightPage.$(
          "body > div.fade.modal.show > div > div > div.modal-body > form > div > input"
        );
        if (tokenInput) {
          const config = CredentialService.getInstance();
          const { readwiseToken } = config.getReadmooCredentials();
          await tokenInput.type(readwiseToken, { delay: 2 });

          await highlightPage.click(
            "body > div.fade.modal.show > div > div > div.modal-body > form > div > div > button"
          );
          await highlightPage.waitForSelector(
            "body > div.fade.export-highlight-modal.modal.show > div > div > div.list-group.list-group-flush > button:nth-child(12)"
          );
          await highlightPage.click(
            "body > div.fade.export-highlight-modal.modal.show > div > div > div.list-group.list-group-flush > button:nth-child(12)"
          );
        }

        await highlightPage.waitForSelector(
          "body > div.fade.export-highlight-modal.modal.show > div > div > div.list-group.list-group-flush > button:nth-child(12) > span.text-secondary > a"
        );
        // await sleep(3000);
        console.log("exported to readwise");
        return;
      } catch {
        console.log("retrying to export to readwise");
      }
    } while (retry++ < MAX_RETRY);

    console.log("exported to readwise failed, more than max retry");
  };
}

async function test() {
  const readmoo = new ReadmooService();
  const booksHighlights = await readmoo.scrapeBooksHighlights({
    isExportToReadwise: false,
  });
  writeToFile(booksHighlights, "readmoo-books-highlights.json", "data");

  // await readmoo.scrapeHighlights("師父");
  // await readmoo.scrapeHighlights("底層網紅");
  // await readmoo.scrapeHighlights("破框能力");

  process.exit(0);
}

// test();
