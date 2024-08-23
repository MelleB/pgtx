import { Client } from 'pg';
import { TransactionContext } from './TransactionContext';

export type PgtxClient = Client & TransactionContext;
