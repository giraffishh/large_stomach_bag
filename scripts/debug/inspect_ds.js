import pkg from "@notionhq/client";
const { Client } = pkg;
import dotenv from "dotenv";

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_KEY });

async function check() {
  const response = await notion.search({
    filter: { property: "object", value: "data_source" },
  });
  console.log(JSON.stringify(response.results[0], null, 2));
}

check();
