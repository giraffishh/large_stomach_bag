import pkg from "@notionhq/client";
const { Client } = pkg;
import dotenv from "dotenv";

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_KEY });

async function check() {
  console.log("Searching for databases...");
  try {
    const response = await notion.search({
      filter: { property: "object", value: "database" },
    });
    console.log(`Found ${response.results.length} databases.`);
    response.results.forEach(db => {
      console.log(`- Title: ${db.title[0]?.plain_text}, ID: ${db.id}, Object: ${db.object}`);
      // Check if it has a data_source_id or something similar
      console.log("  Keys:", Object.keys(db));
    });
  } catch (e) {
    console.log("Search failed:", e);
  }
}

check();
