import path from "path";
import { readFileSync, writeFileSync } from "fs";

/* Function to write to a file given the file, fileName and optionally the dirName */
export const writeToFile = (
  file: any,
  fileName: string,
  dirName: string
): void => {
  writeFileSync(
    path.join(path.dirname(__dirname), `../${dirName}/${fileName}`),
    JSON.stringify(file)
  );
};

/* Function to read a file given the fileName and optionally the dirName */
export const readFromFile = (fileName: string, dirName: string): string => {
  return readFileSync(
    path.join(path.dirname(__dirname), `../${dirName}/${fileName}`),
    "utf-8"
  );
};

export const formatAuthorName = (author: string) => {
  if (author.includes(",")) {
    const names = author
      .split(",")
      .map((name) => name.replace(/^\s*|\s*$/g, ""));
    author = `${names[1]} ${names[0]}`;
  }
  return author;
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
