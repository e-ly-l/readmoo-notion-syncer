require("dotenv").config();
import { Client } from "@notionhq/client";
import {
  GetDatabaseResponse,
  QueryDatabaseResponse,
  GetBlockResponse,
  ListBlockChildrenResponse,
  AppendBlockChildrenResponse,
  GetPageResponse,
  QueryDatabaseParameters,
  CreatePageResponse,
  CreateDatabaseParameters,
  CreatePageParameters,
  UpdateDatabaseResponse,
  UpdatePageResponse,
  DeleteBlockResponse,
  BlockObjectRequest,
} from "@notionhq/client/build/src/api-endpoints";
import { CredentialService } from "../services";
import { writeToFile } from "../utils";

/* Adapter to interact with Notion API directly */
export class NotionAdapter {
  private notion: Client;

  constructor(apiKey?: string) {
    if (!apiKey) {
      const config = CredentialService.getInstance();
      const credentials = config.getNotionCredentials();
      apiKey = credentials.apiKey;
    }

    this.notion = new Client({ auth: apiKey });
  }

  /* Method to create a Notion database */
  createDatabase = async (
    pageId: string,
    dbProperties: any,
    options?: {
      dbName?: string;
      iconUrl?: string;
      coverUrl?: string;
      description?: string;
    }
  ) => {
    const {
      dbName = "Library",
      iconUrl,
      coverUrl,
      description,
    } = options || {};

    try {
      const createDatabaseParams: CreateDatabaseParameters = {
        parent: { page_id: pageId, type: "page_id" },
        title: [{ type: "text", text: { content: dbName, link: null } }],
        is_inline: false,
        properties: dbProperties,
      };

      if (iconUrl) {
        createDatabaseParams.icon = {
          external: { url: iconUrl },
          type: "external",
        };
      }
      if (coverUrl) {
        createDatabaseParams.cover = {
          type: "external",
          external: { url: coverUrl },
        };
      }
      if (description) {
        createDatabaseParams.description = [
          { type: "text", text: { content: description, link: null } },
        ];
      }

      const response = await this.notion.databases.create(createDatabaseParams);
      writeToFile(response, "create-db-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to get database", error);
      throw error;
    }
  };

  /* Method to get a Notion database */
  getDatabase = async (databaseId: string): Promise<GetDatabaseResponse> => {
    try {
      const response = await this.notion.databases.retrieve({
        database_id: databaseId,
      });
      writeToFile(response, "get-db-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to get database", error);
      throw error;
    }
  };

  /* Method to query a Notion database */
  queryDatabase = async (
    query: QueryDatabaseParameters
  ): Promise<QueryDatabaseResponse> => {
    try {
      const response = await this.notion.databases.query(query);
      writeToFile(response, "query-db-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to query database", error);
      throw error;
    }
  };

  /* Method to update properties of a Notion database */
  updateDatabaseProperties = async (
    databaseId: string,
    properties: any
  ): Promise<UpdateDatabaseResponse> => {
    try {
      const response = await this.notion.databases.update({
        database_id: databaseId,
        properties: properties,
      });
      writeToFile(response, "update-db-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to update database", error);
      throw error;
    }
  };

  /* Method to create a Notion page */
  deleteDatabase = async (
    databaseId: string
  ): Promise<UpdateDatabaseResponse> => {
    try {
      const response = await this.notion.databases.update({
        database_id: databaseId,
        archived: true,
      });
      writeToFile(response, "delete-db-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to delete database", error);
      throw error;
    }
  };

  /* Method to get a Notion block */
  getBlock = async (blockId: string): Promise<GetBlockResponse> => {
    try {
      const response = await this.notion.blocks.retrieve({
        block_id: blockId,
      });
      writeToFile(response, "get-block-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to get block", error);
      throw error;
    }
  };

  /* Method to get the children of a Notion block */
  getBlockChildren = async (
    blockId: string
  ): Promise<ListBlockChildrenResponse> => {
    try {
      let blockChildren = await this.notion.blocks.children.list({
        block_id: blockId,
      });

      while (blockChildren.has_more) {
        const remainingBlocks = await this.notion.blocks.children.list({
          block_id: blockId,
          start_cursor: blockChildren.next_cursor as string,
        });

        blockChildren = {
          ...blockChildren,
          next_cursor: remainingBlocks.next_cursor,
          has_more: remainingBlocks.has_more,
          results: [...blockChildren.results, ...remainingBlocks.results],
        };
      }
      writeToFile(blockChildren, "get-block-children-response.json", "data");
      return blockChildren;
    } catch (error: unknown) {
      console.error("Failed to get block children", error);
      throw error;
    }
  };

  /* Method to append new children to a Notion block */
  appendBlockChildren = async (
    blockId: string,
    children: BlockObjectRequest[]
  ): Promise<AppendBlockChildrenResponse> => {
    try {
      let response = await this.notion.blocks.children.append({
        block_id: blockId,
        children: children,
      });
      return response;
    } catch (error: unknown) {
      console.error("Failed to append block children", error);
      throw error;
    }
  };

  /* Method to delete a Notion block */
  deleteBlock = async (blockId: string): Promise<DeleteBlockResponse> => {
    try {
      // const response = await this.notion.blocks.delete({
      //   block_id: blockId,
      // });

      const response = await this.notion.blocks.update({
        block_id: blockId,
        archived: true,
      })

      // writeToFile(response, "delete-block-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to delete block", error);
      throw error;
    }
  };

  /* Method to get a Notion page */
  getPage = async (pageId: string): Promise<GetPageResponse> => {
    try {
      const response = await this.notion.pages.retrieve({
        page_id: pageId,
      });
      writeToFile(response, "get-page-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to get page", error);
      throw error;
    }
  };

  /* Method to create a Notion page */
  createPage = async (
    createPageParameters: CreatePageParameters
  ): Promise<CreatePageResponse> => {
    try {
      const response = await this.notion.pages.create(createPageParameters);
      writeToFile(response, "create-page-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to create page", error);
      throw error;
    }
  };

  /* Method to update properties of a Notion page */
  updatePageProperties = async (
    pageId: string,
    properties: any
  ): Promise<UpdatePageResponse> => {
    try {
      const response = await this.notion.pages.update({
        page_id: pageId,
        properties: properties,
      });
      writeToFile(response, "update-page-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to update page", error);
      throw error;
    }
  };

  /* Method to create a Notion page */
  deletePage = async (pageId: string): Promise<UpdatePageResponse> => {
    try {
      const response = await this.notion.pages.update({
        page_id: pageId,
        archived: true,
      });
      // writeToFile(response, "delete-page-response.json", "data");
      return response;
    } catch (error: unknown) {
      console.error("Failed to delete page", error);
      throw error;
    }
  };
}
