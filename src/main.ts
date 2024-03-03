import { NotionService, ReadmooService } from "./services";
import { readmoo2Notion } from "./types/transformer/readmoo-notion";
import { writeToFile } from "./utils";

export async function run() {
  console.log("Start running...");
  const readwiseToken = process.env.READWISE_TOKEN;
  const isExportToReadwise = readwiseToken ? true : false;

  const readmoo = new ReadmooService();
  const booksHighlights = await readmoo.scrapeBooksHighlights({
    isExportToReadwise,
  });
  await readmoo.destroy();

  writeToFile(booksHighlights, "books-highlights.json", "data");

  const notion = new NotionService();
  await notion.syncToDatabase(booksHighlights, readmoo2Notion, {
    pageId: process.env.NOTION_PAGE_ID, // create a new database on this page
    dbId: process.env.NOTION_DB_ID, // sync to an existing database
  });

  process.exit(0);
}

run();
