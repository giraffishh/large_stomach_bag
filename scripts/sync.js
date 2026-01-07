import pkg from "@notionhq/client";
const { Client } = pkg;
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { Octokit } from "@octokit/rest";
import sharp from "sharp";

// Load environment variables
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DB_ID;

const octokit = process.env.GITHUB_TOKEN 
  ? new Octokit({ auth: process.env.GITHUB_TOKEN }) 
  : null;
const GITHUB_OWNER = "giraffishh";
const GITHUB_REPO = "image-hosting";
const GITHUB_PATH_PREFIX = "food";
// User explicitly requested 'giraffish' (one h) in the mirror URL
const CDN_PREFIX = `https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/${GITHUB_PATH_PREFIX}`;

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

async function processAndUploadImage(imageUrl) {
  if (!octokit) {
    console.warn("Skipping image upload: GITHUB_TOKEN not found.");
    return null;
  }

  try {
    // Generate timestamp-based filename: YYYYMMDD_HHmmss_XXXX.webp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHmmss
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const filename = `${timestamp}_${randomSuffix}.webp`;
    const filePath = `${GITHUB_PATH_PREFIX}/${filename}`;

    console.log(`Downloading image...`);
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Processing image (rotate & resize)...`);
    const processedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF data
      .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true }) // Max 1080p, preserve aspect ratio
      .webp({ quality: 80 })
      .toBuffer();

    const contentEncoded = processedBuffer.toString('base64');

    console.log(`Uploading ${filename} to GitHub...`);
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `Upload ${filename} via sync script`,
      content: contentEncoded,
      branch: 'main',
    });

    return `${CDN_PREFIX}/${filename}`;
  } catch (error) {
    console.error(`Error processing image:`, error);
    return null;
  }
}

async function simplifyPage(page) {
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
  let coverUrl = props.CoverURL?.url || "";

  // Logic: 
  // 1. Must have a Cover image source.
  // 2. CoverURL field must be EMPTY. If it has any content, we skip.
  if (cover && !coverUrl) {
      console.log(`Processing page ${page.id}: Found Cover but no CoverURL. Uploading...`);
      
      const newUrl = await processAndUploadImage(cover);
      
      if (newUrl) {
          coverUrl = newUrl;
          
          // Write back to Notion
          try {
              console.log(`Updating Notion page ${page.id} with new CoverURL...`);
              await notion.pages.update({
                  page_id: page.id,
                  properties: {
                      CoverURL: {
                          url: newUrl
                      }
                  }
              });
          } catch (err) {
              console.error(`Failed to update Notion page ${page.id}:`, err);
          }
      }
  }

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

  // Security & Cleanup: 
  // If we have a permanent coverUrl, remove the temporary notion cover link 
  // to avoid GitHub secret scanning warnings.
  const finalCover = coverUrl ? "" : cover;

  return {
    id: page.id,
    name,
    cover: finalCover,
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

  // Process sequentially to avoid rate limits or overwhelming logs
  const simplifiedData = [];
  for (const page of pages) {
      const simplified = await simplifyPage(page);
      simplifiedData.push(simplified);
  }

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)){
      fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(simplifiedData, null, 2));
  console.log(`Data synced to ${OUTPUT_PATH}`);
}

main();