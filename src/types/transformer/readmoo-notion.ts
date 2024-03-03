import { ReadmooBook, ReadmooBookAnnotation } from "../readmoo";
import { CreateBlockParams, CreateNotionPageParams, CreateNotionPageProperties, DatabaseProperties } from "../notion";
import _get from "lodash/get";

const readmooBook2NotionProperties = (
  properties: DatabaseProperties,
  book: ReadmooBook
): CreateNotionPageProperties => {

  // FIXME: miss url, author
  let params: CreateNotionPageProperties = {
    Title: {
      title: [{ type: "text", text: { content: book.title, link: null } }],
    },
    "Full Title": {
      rich_text: [{ type: "text", text: { content: book.title, link: null } }],
    },
    // Highlights: { number: book.annotationsCount.highlightsCount },
    "Last Synced": { date: { start: new Date().toISOString() } },
  };

  const options = _get(properties, "Category.select.options", []) as {
    id: string;
    name: string;
  }[];
  const categoryBookId = options.find((op) => op.name === "Books")?.id;
  if (categoryBookId) {
    params["Category"] = { select: { id: categoryBookId } };
  }

  return params;
}

const readmooBookAnnotation2NotionBlock = (annotation: ReadmooBookAnnotation): CreateBlockParams[] => {
  const blockFactory = (content: string): CreateBlockParams => ({
    type: "paragraph",
    paragraph: {
      rich_text: [{ text: { content, link: null } }],
    },
  });

  let blocks = [];
  const highlightText = annotation.highlight;
  blocks.push(blockFactory(highlightText));

  if (annotation.note) {
    blocks.push(blockFactory(annotation.note));
  }

  blocks.push(blockFactory(""));
  return blocks;
}

export const readmoo2Notion = (
  properties: DatabaseProperties,
  book: ReadmooBook
): CreateNotionPageParams => ({
  title: book.title,
  icon: { type: "external", external: { url: book.cover } },
  cover: { type: "external", external: { url: book.cover } },
  properties: readmooBook2NotionProperties(properties, book),
  children: Array.from(book.annotations || [])
    .map(readmooBookAnnotation2NotionBlock)
    .flat(),
});
