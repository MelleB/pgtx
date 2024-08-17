# pgtx

Keep your PostgreSQL transactions safe and simple with pgtx.

---

`pgtx` is a lightweight TypeScript library that simplifies the use of nested transactions with savepoints in PostgreSQL. With pgtx, you can effortlessly manage savepoints in your database transactions without having to explicitly manage them yourself.

The main motivation to write this libary was to be able to execute tests in transactions without affecting the code-under-test, which might also use transactions.
Using `pgtx` you can wrap each test in its own transaction, leveraging eitehr PostgreSQL transactions or savepoints, whichever is appropriate.

## Features

- **Nested Transactions**: Automatically handles savepoints, allowing you to create nested transactions.
- **Commit and Rollback**: Easily commit or rollback transactions, including nested ones.
- **Seamless Integration**: Works as a drop-in wrapper around the existing `pg` client.

## Installation

This package has a peer dependency on `pg` so in order to install `pgtx` via npm execute:

```bash
$ npm install pg pgtx
```

... or use your package manager du jour. Other than the peer dependency it has no direct dependencies.

## Usage

To use pgtx, wrap your PostgreSQL client with `pgtx`. You can then perform transactions as usual, and pgtx will manage savepoints automatically.

```typescript
import pgtx, { PgtxClient } from "pgtx";
import { Client } from "pg";

const client = new Client({
  /* connection config */
});
const db: PgtxClient = pgtx(client);

await db.transaction(async (tx) => {
  // Your transactional code here, e.g.
  await db.query("INSERT INTO ...", [value]);

  await trx.transaction(async (nestedTx) => {
    // Nested transaction handled with savepoint
    // Savepoint is automatically released here
  });

  await tx.transaction(async (nestedTx) => {
    // Or call rollback in order to rollback to the previous savepoint
    await nestedTx.rollback();
  });

  // If an exception is caught it is rolled back and propagated so all
  // parent transactions can handle the exception as well
  try {
    await tx.transation(async (nestedTx) => {
      throw new Error("Some issue occured");
    });
  } catch (e) {
    // Handle recovery scenario
  }

  // Commit is applied automatically
});
```

## API

**`PgtxClient`** extends `pg.Client` and adds:

- `async transaction(tx: PgtxClient => void)`: Begins a new transaction or savepoint if already in a transaction.
- `async rollback()`: Rolls back the current transaction or savepoint.
- `async commit()`: Commits the current transaction or releases the savepoint -- although typically you will not use this method

## Contributions

Contributions are welcome! Please submit issues or pull requests to the GitHub repository.

### Development

The tests of this library require access to a postgres database.
Note that the tests will modify data in this database, so make sure to run them in a separate database.

A connection to the database is established based on a `DATABASE_URL` environment variable.
This variable needs to be present in either the environment itself or a `.env` file in the root of the solution.
The connection string should be formatted as follows: `postgresql://user:password@localhost:5432/dbname?sslmode=disable`.

To get started:

1. Start database
2. Either set the `DATABASE_URL` or `cp .env.dist .env` and edit `DATABASE_URL` variable
3. Run tests with `npm test`

## License

This library is licensed under the [MIT license](./LICENSE.md).
