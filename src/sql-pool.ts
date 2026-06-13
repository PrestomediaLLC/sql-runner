import { createPool, Pool, PoolOptions } from 'mysql2/promise';
import { createQueryFunction } from './create-query-function.js';
import { SqlContext, SqlRunner } from './sql-context.js';

export class SqlPool implements SqlContext {
	readonly #pool: Pool;
	readonly sql: SqlRunner;

	constructor(poolOptions: PoolOptions) {
		this.#pool = createPool(poolOptions);

		this.sql = {
			UNIX_TIMESTAMP: '::UNIX_TIMESTAMP()',
			isTransaction: false,
			query: createQueryFunction(this.#pool.query.bind(this.#pool)),
			transaction: this.transaction.bind(this),
		};
	}

	async transaction<T>(action: (ctx: SqlContext) => Promise<T>, ctx: SqlContext): Promise<T> {
		// If we're already executing inside an active transaction, reuse the context directly
		if (ctx.sql.isTransaction) {
			return await action(ctx);
		}

		// Otherwise, safely pull a connection from our private pool reference
		const cnx = await this.#pool.getConnection();

		try {
			await cnx.beginTransaction();

			const transactionCtx: SqlContext = {
				sql: {
					UNIX_TIMESTAMP: '::UNIX_TIMESTAMP()',
					isTransaction: true,
					query: createQueryFunction(cnx.query.bind(cnx)),
					transaction: async <T>(action: (ctx: SqlContext) => Promise<T>, ctx: SqlContext) => {
						return await action(ctx);
					},
				},
			};

			const result = await action(transactionCtx);
			await cnx.commit();
			return result;
		} catch (error) {
			await cnx.rollback();
			throw error;
		} finally {
			cnx.release();
		}
	}

	/**
	 * Close all connections in the pool safely.
	 */
	async end(): Promise<void> {
		await this.#pool.end();
	}
}
