import { describe, test, expect, assert } from 'vitest';
import { getClient, createTable, checkRows, insertRow } from './test/util';

describe('happy flows', async () => {
  test('single level non explicit commit', async () => {
    const tableName = 'pgtx_happy_table1';
    const client = await getClient();
    await client.transaction(async (tx) => {
      await createTable(tx, tableName);
      await insertRow(tx, tableName, 1);
    });

    await checkRows(client, tableName, 1);
  });

  test('nested multiple non explicit commits', async () => {
    const client = await getClient();
    const tableName = 'pgtx_happy_table2';

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

  test('simple rollback', async () => {
    const tableName = 'pgtx_happy_table3';
    const client = await getClient();
    await createTable(client, tableName);

    await client.transaction(async (tx) => {
      await insertRow(tx, tableName, 1);
      await tx.rollback();
    });

    await checkRows(client, tableName, 0);
  });

  test('nested rollback', async () => {
    const tableName = 'pgtx_happy_table4';
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

  test('nested rollback with continuation', async () => {
    const tableName = 'pgtx_happy_table5';
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

  test('committing an unstarted transactions works', async () => {
    const client = await getClient();

    let noticeCount = 0;
    client.on('notice', (notice) => {
      noticeCount += 1;
      assert.equal(notice.message, 'there is no transaction in progress');
    });

    await client.commit();

    assert.equal(noticeCount, 1);
  });

  test('rolling back an unstarted transactions works', async () => {
    const client = await getClient();

    let noticeCount = 0;
    client.on('notice', (notice) => {
      noticeCount += 1;
      assert.equal(notice.message, 'there is no transaction in progress');
    });

    await client.rollback();

    assert.equal(noticeCount, 1);
  });
});

describe('exception handling', async () => {
  test('exception executes rollback', async () => {
    const tableName = 'pgtx_exception_table1';
    const client = await getClient();

    await createTable(client, tableName);
    try {
      await client.transaction(async (tx) => {
        await insertRow(tx, tableName, 1);
        throw new Error();
      });
    } catch {
      // catch-all
    }

    await checkRows(client, tableName, 0);
  });

  test('nested exception without try/catch rolls back everything', async () => {
    const tableName = 'pgtx_exception_table2';
    const client = await getClient();

    try {
      await createTable(client, tableName);
      await client.transaction(async (tx) => {
        await insertRow(tx, tableName, 1);
        await tx.transaction(async (tx2) => {
          await insertRow(tx2, tableName, 2);
          throw new Error('dummy-msg');
        });
      });
    } catch (e) {
      expect(e.toString()).toMatch(/dummy-msg/);
    }

    await checkRows(client, tableName, 0);
  });

  test('nested exception executes rollback to savepoint', async () => {
    const tableName = 'pgtx_exception_table3';
    const client = await getClient();

    await createTable(client, tableName);
    await client.transaction(async (tx) => {
      await insertRow(tx, tableName, 1);
      try {
        await tx.transaction(async (tx2) => {
          await insertRow(tx2, tableName, 2);
          throw new Error();
        });
      } catch {
        // catch error
      }
    });

    await checkRows(client, tableName, 1);
  });
});

describe('explicit mode', async () => {
  test('unnested transaction - commit', async () => {
    const tableName = 'pgtx_explicit_table1';
    const client = await getClient();

    await createTable(client, tableName);
    const tx = await client.transaction();
    await insertRow(tx, tableName, 1);
    await tx.commit();

    await checkRows(client, tableName, 1);
  });

  test('unnested transaction - rollback', async () => {
    const tableName = 'pgtx_explicit_table2';
    const client = await getClient();

    await createTable(client, tableName);
    const tx = await client.transaction();
    await insertRow(tx, tableName, 1);
    await tx.rollback();

    await checkRows(client, tableName, 0);
  });

  test('nested transaction - commit', async () => {
    const tableName = 'pgtx_explicit_table3';
    const client = await getClient();

    await createTable(client, tableName);
    const tx = await client.transaction();
    await tx.transaction(async (tx2) => {
      await insertRow(tx2, tableName, 1);
    });
    await tx.commit();

    await checkRows(client, tableName, 1);
  });

  test('nested transaction - rollback', async () => {
    const tableName = 'pgtx_explicit_table4';
    const client = await getClient();

    await createTable(client, tableName);
    const tx = await client.transaction();
    await tx.transaction(async (tx2) => {
      await insertRow(tx2, tableName, 1);
    });
    await tx.rollback();

    await checkRows(client, tableName, 0);
  });

  test('commit twice throws', async () => {
    const client = await getClient();
    const tx = await client.transaction();
    await tx.commit();
    await expect(() => tx.commit()).rejects.toThrow(
      'Cannot commit a transaction that is not active',
    );
  });

  test('rollback twice throws', async () => {
    const client = await getClient();
    const tx = await client.transaction();
    await tx.rollback();
    await expect(() => tx.rollback()).rejects.toThrow(
      'Cannot roll back a transaction that is not active',
    );
  });
});
