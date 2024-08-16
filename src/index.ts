import { Client } from "pg";
import { randomUUID } from "crypto";

enum TransactionStatus {
  ACTIVE,
  COMMITTED,
  CANCELLED,
}

class TransactionContext {
  protected status: TransactionStatus = TransactionStatus.ACTIVE;
  constructor(
    private client: Client,
    private parentTransaction?: TransactionContext,
    private activeSavePoint?: string
  ) {}

  async transaction(childTransaction: (client: PgtxClient) => Promise<void>): Promise<void> {
    let activeSavePointName: string | undefined = undefined;

    if (this.parentTransaction) {
      activeSavePointName = "sp_" + randomUUID().replaceAll("-", "_");
      await this.client.query(`SAVEPOINT ${activeSavePointName}`);
    } else {
      await this.client.query("BEGIN");
    }

    const childCtx = new TransactionContext(this.client, this, activeSavePointName);
    await childTransaction(createProxy(this.client, childCtx));

    if (childCtx.status === TransactionStatus.ACTIVE) {
      await childCtx.commit();
    }
  }

  async commit(): Promise<PgtxClient> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error("Cannot commit a transaction that is not active");
    }
    if (this.parentTransaction && this.activeSavePoint) {
      await this.client.query(`RELEASE SAVEPOINT ${this.activeSavePoint}`);
      return createProxy(this.client, this.parentTransaction);
    }

    await this.client.query("COMMIT");
    this.status = TransactionStatus.COMMITTED;
    return createProxy(this.client, this.parentTransaction || this);
  }

  async rollback(): Promise<PgtxClient> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error("Cannot roll back a transaction that is not active");
    }
    if (this.activeSavePoint && this.parentTransaction) {
      await this.client.query(`ROLLBACK TO SAVEPOINT ${this.activeSavePoint}`);
      this.status = TransactionStatus.CANCELLED;
      return createProxy(this.client, this.parentTransaction);
    }

    await this.client.query("ROLLBACK");
    this.status = TransactionStatus.CANCELLED;
    return createProxy(this.client, this.parentTransaction || this);
  }
}

function createProxy(client: Client, transactionContext: TransactionContext) {
  return new Proxy(
    { client, transactionContext },
    {
      get(target: { client: Client; transactionContext: TransactionContext }, prop: string) {
        if (prop in target.client) {
          // @ts-expect-error prop cannot be used as index
          return target.client[prop].bind(target.client);
        }
        if (prop in target.transactionContext) {
          // @ts-expect-error prop cannot be used as index
          return target.transactionContext[prop].bind(target.transactionContext);
        }
        return undefined;
      },
    }
  ) as unknown as Client & TransactionContext;
}

export type PgtxClient = Client & TransactionContext;
export default function pgtx(client: Client): PgtxClient {
  const transactionContext = new TransactionContext(client);
  return createProxy(client, transactionContext);
}
