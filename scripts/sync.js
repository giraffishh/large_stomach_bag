import pkg from "@notionhq/client";
const { Client } = pkg;
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DB_ID;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.resolve(__dirname, "../src/data/restaurants.json");

/**
 * In Notion API v2025-09-03, databases are containers and data is queried via 'data_source'.
 * This function finds the data_source_id associated with the given database_id.
 */
async function findDataSourceId(dbId) {
  // Normalize ID (remove hyphens for comparison if needed, but Notion usually returns hyphenated)
  const normalizedDbId = dbId.includes("-") ? dbId : dbId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");

  console.log(`Searching for data source associated with database: ${normalizedDbId}`);
  
  const response = await notion.search({
    filter: { property: "object", value: "data_source" },
  });

  const dataSource = response.results.find(res => 
    res.parent?.type === "database_id" && res.parent.database_id === normalizedDbId
  );

  if (!dataSource) {
    throw new Error(`Could not find a data source for database ID ${normalizedDbId}. Make sure the database is shared with the integration.`);
  }

  return dataSource.id;
}

async function fetchAllPages() {
  const dataSourceId = await findDataSourceId(databaseId);
  console.log(`Using Data Source ID: ${dataSourceId}`);

  let allPages = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    try {
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: startCursor,
      });

      allPages.push(...response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    } catch (error) {
      console.error("Error fetching pages from Notion:", error);
      process.exit(1);
    }
  }

  return allPages;
}

function getPlainText(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) return "";
  return richTextArray.map((t) => t.plain_text).join("");
}

function simplifyPage(page) {
  const props = page.properties;
  
  // Name (Title)
  const name = props.Name?.title ? getPlainText(props.Name.title) : "Unknown";

  // Cover (Files & media)
  let cover = "";
  if (props.Cover?.files?.length > 0) {
      const fileObj = props.Cover.files[0];
      if (fileObj.type === 'file') {
          cover = fileObj.file.url;
      } else if (fileObj.type === 'external') {
          cover = fileObj.external.url;
      }
  }

  // CoverURL (Link)
  const coverUrl = props.CoverURL?.url || "";

  // Tags (Multi-select)
  const tags = props.Tags?.multi_select ? props.Tags.multi_select.map(t => t.name) : [];

  // Rating (Select)
  const rating = props.Rating?.select?.name || "";

  // Address (Link)
  const address = props.Address?.url || "";

  // Review (Text)
  const review = props.Review?.rich_text ? getPlainText(props.Review.rich_text) : "";

  // Price (Num)
  const price = props.Price?.number || 0;

  return {
    id: page.id,
    name,
    cover,
    coverUrl,
    tags,
    rating,
    address,
    review,
    price,
    lastEdited: page.last_edited_time
  };
}

async function main() {
  if (!process.env.NOTION_KEY || !process.env.NOTION_DB_ID) {
    console.error("Missing NOTION_KEY or NOTION_DB_ID in .env file");
    process.exit(1);
  }

  console.log("Starting Notion sync...");
  const pages = await fetchAllPages();
  console.log(`Found ${pages.length} pages.`);

  const simplifiedData = pages.map(simplifyPage);

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)){
      fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(simplifiedData, null, 2));
  console.log(`Data synced to ${OUTPUT_PATH}`);
}

main();