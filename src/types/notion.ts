import {
  BlockObjectRequest,
  CreatePageParameters,
  PartialDatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

export type DatabaseProperties = PartialDatabaseObjectResponse["properties"];

export type CreateNotionPageParams = {
  title: string;
} & Partial<CreatePageParameters>;

export type CreateNotionPageProperties = CreatePageParameters["properties"];

export type CreateBlockParams = BlockObjectRequest;
