import { Client } from 'pg';
import { TransactionContext } from './TransactionContext';
import { createProxy } from './create-proxy';
import { PgtxClient } from './types';

export type { PgtxClient };
export default function pgtx(client: Client): PgtxClient {
  const transactionContext = new TransactionContext(client);
  return createProxy(client, transactionContext);
}
