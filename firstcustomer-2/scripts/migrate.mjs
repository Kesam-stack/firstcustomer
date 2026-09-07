import fs from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured");
  process.exit(1);
}

const sql = await fs.readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 1,
});

try {
  await pool.query(sql);
  console.log("FirstCustomer database schema is up to date.");
} finally {
  await pool.end();
}
