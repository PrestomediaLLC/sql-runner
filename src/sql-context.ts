import * as mysql from 'mysql2/promise';

export interface SqlRunner {
	readonly UNIX_TIMESTAMP: '::UNIX_TIMESTAMP()';
	readonly isTransaction: boolean;

	/**
	 * Run a SQL query with standard parameterized values.
	 */
	query<T = any>(statement: string | string[], valuesArray?: any[]): Promise<T>;

	/**
	 * Pass a function that can perform multiple sql queries and mutations, all of which
	 * will be wrapped in a transaction. All changes will be committed or all changes
	 * will be reverted.
	 */
	readonly transaction: <T>(action: (ctx: SqlContext) => Promise<T>, ctx: SqlContext) => Promise<T>;
}

export interface SqlContext {
	sql: SqlRunner;
}
