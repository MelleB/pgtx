import { Client } from 'pg';
import { TransactionContext } from './TransactionContext';

export function createProxy(
  client: Client,
  transactionContext: TransactionContext,
) {
  return new Proxy(
    { client, transactionContext },
    {
      get(
        target: { client: Client; transactionContext: TransactionContext },
        prop: string,
      ) {
        if (prop in target.client) {
          // @ts-expect-error prop cannot be used as index
          return target.client[prop].bind(target.client);
        }
        if (prop in target.transactionContext) {
          // @ts-expect-error prop cannot be used as index
          return target.transactionContext[prop].bind(
            target.transactionContext,
          );
        }
        return undefined;
      },
    },
  ) as unknown as Client & TransactionContext;
}
