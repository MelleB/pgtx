import { Client } from "pg";
import { onTestFinished, expect } from "vitest";
import pgtx, { PgtxClient } from "..";

export async function getClient(): Promise<PgtxClient> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  onTestFinished(async () => await client.end());

  return pgtx(client);
}

export async function checkRows(
  client: Client,
  tableName: string,
  expectedCount: number,
) {
  const result = await client.query(`SELECT * FROM ${tableName}`);

  expect(result.rowCount).equals(expectedCount);
  for (let i = 0; i < expectedCount; i++) {
    expect(result.rows[i].x).equals(i + 1);
  }
}

export async function createTable(client: Client, tableName: string) {
  await client.query(`DROP TABLE IF EXISTS ${tableName};`);
  await client.query(`CREATE TABLE ${tableName} (x INT);`);
}

export async function insertRow(
  client: Client,
  tableName: string,
  value: number,
) {
  await client.query(`INSERT INTO ${tableName}(x) VALUES ($1)`, [value]);
}
