import { describe, test } from "vitest";
import { getClient, createTable, checkRows, insertRow } from "./test/util";

describe("pgNested", async () => {
  test("single level non explicit commit", async () => {
    const client = await getClient();
    await client.transaction(async (tx) => {
      await createTable(tx, "table1");
      await insertRow(tx, "table1", 1);
    });

    await checkRows(client, "table1", 1);
  });

  test("nested multiple non explicit commits", async () => {
    const client = await getClient();
    const tableName = "table2";

    await client.transaction(async (tx) => {
      await createTable(tx, tableName);

      await tx.transaction(async (tx2) => {
        await insertRow(tx2, tableName, 1);
      });

      await tx.transaction(async (tx3) => {
        await insertRow(tx3, tableName, 2);
      });

      await tx.transaction(async (tx4) => {
        await insertRow(tx4, tableName, 3);
      });
    });

    await checkRows(client, tableName, 3);
  });

  test("simple rollback", async () => {
    const tableName = "table3";
    const client = await getClient();
    await createTable(client, tableName);

    await client.transaction(async (tx) => {
      await insertRow(tx, tableName, 1);
      await tx.rollback();
    });

    await checkRows(client, tableName, 0);
  });

  test("nested rollback", async () => {
    const tableName = "table4";
    const client = await getClient();

    await client.transaction(async (tx) => {
      await createTable(tx, tableName);

      await tx.transaction(async (tx2) => {
        await insertRow(tx2, tableName, 1);
        await tx2.rollback();
      });
    });

    await checkRows(client, tableName, 0);
  });

  test("nested rollback with continuation", async () => {
    const tableName = "table5";
    const client = await getClient();

    await client.transaction(async (tx) => {
      await createTable(tx, tableName);

      await tx.transaction(async (tx2) => {
        await insertRow(tx2, tableName, 100);
        await tx2.rollback();
      });

      await tx.transaction(async (tx2) => {
        await insertRow(tx2, tableName, 1);
      });
    });

    await checkRows(client, tableName, 1);
  });
});
