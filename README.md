# pgtx

---

Keep your PostgreSQL transactions safe and simple with pgtx.

---

`pgtx` is a lightweight TypeScript library that simplifies the use of nested transactions with savepoints in PostgreSQL. With pgtx, you can effortlessly manage savepoints in your database transactions without having to explicitly manage them yourself.

## Features

- **Nested Transactions**: Automatically handles savepoints, allowing you to create nested transactions.
- **Commit and Rollback**: Easily commit or rollback transactions, including nested ones.
- **Seamless Integration**: Works as a drop-in wrapper around the existing `pg` client.

## Installation

Install pgtx via npm:

```bash
npm install pg pgtx
```

## Usage

To use pgtx, wrap your PostgreSQL client with `pgtx`. You can then perform transactions as usual, and pgtx will manage savepoints automatically.

```typescript
import pgtx from "pgtx";
import { Client } from "pg";

const client = new Client({
  /* connection config */
});
const db = pgtx(client);

await db.transaction(async (tx) => {
  // Your transactional code here

  await trx.transaction(async (nestedTx) => {
    // Nested transaction handled with savepoint
    // Savepoint is automatically released here
  });

  await tx.transaction(async (nestedTx) => {
    // Or call rollback in order to rollback to the previous savepoint
    nestedTx.rollback();
  });

  // Commit is applied automatically
});
```

## API

- **`transaction`**: Begins a new transaction or savepoint if already in a transaction.
- **`commit`**: Commits the current transaction or releases the savepoint.
- **`rollback`**: Rolls back the current transaction or to the savepoint.

## License

This library is licensed under the MIT License.

# Contributions

Contributions are welcome! Please submit issues or pull requests to the GitHub repository.
