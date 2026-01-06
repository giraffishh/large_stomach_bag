import pkg from "@notionhq/client";
const { Client } = pkg;
import dotenv from "dotenv";

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_KEY });

async function check() {
  const id1 = "2e08beff9e3980dd94d7d4be1ef759b2";
  const id2 = "2e08beff9e39802c82b4000cecf6599b";

  console.log("Checking ID 1 (from path):", id1);
  try {
    const db1 = await notion.databases.retrieve({ database_id: id1 });
    console.log("ID 1 is a Database! Title:", db1.title[0]?.plain_text);
  } catch (e) {
    console.log("ID 1 Retrieve failed:", e.code);
  }

  console.log("\nChecking ID 2 (from v= parameter):", id2);
  try {
    const db2 = await notion.databases.retrieve({ database_id: id2 });
    console.log("ID 2 is a Database! Title:", db2.title[0]?.plain_text);
  } catch (e) {
    console.log("ID 2 Retrieve failed:", e.code);
  }

  console.log("\nChecking notion.databases methods:");
  console.log(Object.keys(notion.databases));
}

check();
