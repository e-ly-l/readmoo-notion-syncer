require("dotenv").config();
import { ConfigCredentials } from "../types";
import { readFromFile } from "../utils";

export class CredentialService {
  private config: ConfigCredentials;

  private constructor() {
    this.config = {
      notion: {
        apiKey: process.env.NOTION_API_KEY as string,
        dbId: process.env.NOTION_DB_ID as string,
      },
      readmoo: {
        email: process.env.READMOO_EMAIL as string,
        password: process.env.READMOO_PASSWORD as string,
        readwiseToken: process.env.READMOO_READWISE_TOKEN as string,
      },
    };
  }

  private static instance: CredentialService;
  public static getInstance(): CredentialService {
    if (!CredentialService.instance) {
      CredentialService.instance = new CredentialService();
    }
    return CredentialService.instance;
  }

  getNotionCredentials = () => this.config.notion;
  getReadmooCredentials = () => this.config.readmoo;

  getFromData = () => readFromFile("credentials.json", "data");
}
