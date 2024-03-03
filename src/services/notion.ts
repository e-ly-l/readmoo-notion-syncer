import { NotionAdapter } from "../adapters";
import { readwiseDatabaseProperties } from "../constants/notion";
import { CreateNotionPageParams, DatabaseProperties } from "../types/notion";
import _get from "lodash/get";

export class NotionService {
  private notion: NotionAdapter;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.notion = new NotionAdapter(apiKey);
    } else {
      this.notion = new NotionAdapter();
    }
  }

  private async createDatabasePage(
    parentDbId: string,
    dbPage: CreateNotionPageParams
  ) {
    const blocks = structuredClone(dbPage.children) || [];

    const newPage = await this.notion.createPage({
      parent: { database_id: parentDbId },
      icon: dbPage.icon,
      cover: dbPage.cover,
      properties: dbPage.properties!,
      children: blocks.splice(0, 100),
    });

    const pageId = newPage.id;
    while (blocks.length > 0) {
      await this.notion.appendBlockChildren(pageId, blocks.splice(0, 100));
    }
  }

  private async updateDatabasePage(
    parentDbId: string,
    oldPageId: string,
    dbPage: CreateNotionPageParams
  ) {
    /* Method 1: Delete old page and re-create */
    await this.notion.deletePage(oldPageId);
    await this.createDatabasePage(parentDbId, dbPage);

    /* Method 2: Delete all blocks and re-create */
    // error while deleting blocks
    // const oldBlocks = await this.notion.getBlockChildren(pageId);
    // const oldBlockIds = oldBlocks.results.map(b => b.id);
    // const deleteBlockPromises = oldBlockIds.map(id => this.notion.deleteBlock(id));
    // for (const p of deleteBlockPromises) {
    //   try { await p; } catch { }
    // }

    // await this.notion.updatePageProperties(pageId, dbPage.properties!);
    // await this.notion.appendBlockChildren(pageId, dbPage.children!);
  }

  async syncToDatabase<T>(
    rows: T[],
    rowFn: (properties: DatabaseProperties, row: T) => CreateNotionPageParams,
    target: { pageId?: string; dbId?: string }
  ) {
    if (!target.pageId && !target.dbId) {
      throw new Error("No target specified");
    }
    console.log({ pageId: target.pageId, dbId: target.dbId });

    let dbId;
    let dbProperties: DatabaseProperties = {};
    let dbPagesMap: {
      [title: string]: { pageId: string; pageProperties?: any };
    } = {};
    if (target.dbId) {
      const oldDb = await this.notion.getDatabase(target.dbId);
      dbId = oldDb.id;
      dbProperties = oldDb.properties;

      const pages = await this.notion.queryDatabase({
        database_id: target.dbId,
      });
      for (const page of pages.results) {
        if (page.object === "page") {
          const title = _get(
            page,
            "properties.Title.title[0].text.content",
            ""
          );
          if (title) {
            dbPagesMap[title] = {
              pageId: page.id,
              pageProperties: _get(page, "properties"),
            };
          }
        }
      }

      console.log("sync to existing db...");
    } else if (target.pageId && !target.dbId) {
      const newDB = await this.notion.createDatabase(
        target.pageId,
        readwiseDatabaseProperties
      );
      dbId = newDB.id;
      dbProperties = newDB.properties;
      console.log("sync to new db...");
    }

    try {
      const rowFactory = (row: T) => rowFn(dbProperties, row);
      const dbPages = rows.map(rowFactory);
      // console.log(dbPages);

      for (const dbPage of dbPages) {
        try {
          const { title } = dbPage;

          if (Object.keys(dbPagesMap).includes(title)) {
            console.log("Updating page", title);

            const { pageId } = dbPagesMap[title];
            await this.updateDatabasePage(dbId!, pageId, dbPage);
          } else {
            console.log("Creating page", title);

            await this.createDatabasePage(dbId!, dbPage);
          }
        } catch {
          throw new Error("Error while syncing books to Notion");
          // break;
        }
      }
      console.log("Synced data to Notion");
    } catch (e: unknown) {
      console.error(e);
      // console.error((e as Error).message);
      // Rollback
      if (target.pageId) {
        await this.notion.deleteDatabase(dbId!);
      }
    }
  }
}
