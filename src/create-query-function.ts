import * as mysql from 'mysql2/promise';

export type SqlQueryFunction = <T = any>(
	statement: string | string[],
	valuesArray?: any[],
) => Promise<T>;

export function createQueryFunction(
	queryFn: (sql: string, values?: any[]) => Promise<[any, any]>,
): SqlQueryFunction {
	return async <T = any>(statement: string | string[], valuesArray?: any[]): Promise<T> => {
		// If the sql statements were passed on separate line, join them into one.
		const q = statement instanceof Array ? statement.join(' ') : statement;

		valuesArray = valuesArray ?? [];

		// Mysql2 safely parameterizes and quotes everything in valuesArray first
		let formattedQuery = mysql.format(q, valuesArray);

		// Perform a strict, exact string replacement for the whitelisted token
		// Using .replaceAll ensures all instances in a bulk/multi-row insert are caught safely
		formattedQuery = formattedQuery.replaceAll("'::UNIX_TIMESTAMP()'", 'UNIX_TIMESTAMP()');

		const [results] = await queryFn(formattedQuery);
		return results as T;
	};
}
