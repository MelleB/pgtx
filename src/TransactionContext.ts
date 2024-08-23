import { Client } from 'pg';
import { randomUUID } from 'crypto';
import { PgtxClient } from './types';
import { createProxy } from './create-proxy';

export enum TransactionStatus {
  ACTIVE,
  COMMITTED,
  CANCELLED,
}

export class TransactionContext {
  protected status: TransactionStatus = TransactionStatus.ACTIVE;
  constructor(
    private client: Client,
    private parentTransaction?: TransactionContext,
    private activeSavePoint?: string,
  ) {}

  async transaction(
    childTransaction?: (client: PgtxClient) => Promise<void>,
  ): Promise<PgtxClient> {
    let activeSavePointName: string | undefined = undefined;

    if (this.parentTransaction) {
      activeSavePointName = 'sp_' + randomUUID().replaceAll('-', '_');
      await this.client.query(`SAVEPOINT ${activeSavePointName}`);
    } else {
      await this.client.query('BEGIN');
    }

    const childCtx = new TransactionContext(
      this.client,
      this,
      activeSavePointName,
    );

    const proxy = createProxy(this.client, childCtx);
    if (!childTransaction) {
      return proxy;
    }

    try {
      await childTransaction(proxy);
    } catch (e) {
      await childCtx.rollback();
      throw e;
    }

    if (childCtx.status === TransactionStatus.ACTIVE) {
      await childCtx.commit();
    }

    return createProxy(this.client, this);
  }

  async commit(): Promise<PgtxClient> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error('Cannot commit a transaction that is not active');
    }
    if (this.parentTransaction && this.activeSavePoint) {
      await this.client.query(`RELEASE SAVEPOINT ${this.activeSavePoint}`);
      return createProxy(this.client, this.parentTransaction);
    }

    await this.client.query('COMMIT');
    this.status = TransactionStatus.COMMITTED;
    return createProxy(this.client, this.parentTransaction || this);
  }

  async rollback(): Promise<PgtxClient> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error('Cannot roll back a transaction that is not active');
    }
    if (this.activeSavePoint && this.parentTransaction) {
      await this.client.query(`ROLLBACK TO SAVEPOINT ${this.activeSavePoint}`);
      this.status = TransactionStatus.CANCELLED;
      return createProxy(this.client, this.parentTransaction);
    }

    await this.client.query('ROLLBACK');
    this.status = TransactionStatus.CANCELLED;
    return createProxy(this.client, this.parentTransaction || this);
  }
}
