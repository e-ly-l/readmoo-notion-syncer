type BaseCredentials = {
  email: string;
  password: string;
};

export type NotionCredentials = {
  apiKey: string;
  dbId?: string;
};

export type ReadmooCredentials = {
  readwiseToken: string;
} & BaseCredentials;

export type ConfigCredentials = {
  notion: NotionCredentials;
  readmoo: ReadmooCredentials;
};
