import pkg from "@notionhq/client";
const { Client } = pkg;
import dotenv from "dotenv";

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_KEY });

async function check() {
  console.log("Searching for data_sources...");
  try {
    const response = await notion.search({
      filter: { property: "object", value: "data_source" },
    });
    console.log(`Found ${response.results.length} results.`);
    response.results.forEach(res => {
      console.log(`- Title: ${res.title ? (res.title[0]?.plain_text || 'No title') : 'No title property'}, ID: ${res.id}, Object: ${res.object}`);
      if (res.database_id) console.log("  Database ID:", res.database_id);
    });
  } catch (e) {
    console.log("Search failed:", e);
  }
}

check();
