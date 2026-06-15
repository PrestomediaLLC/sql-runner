# @prestomedia/sql-runner

[![npm version](https://img.shields.io/npm/v/@prestomedia/sql-runner.svg?style=flat-square)](https://www.npmjs.com/package/@prestomedia/sql-runner)
[![npm downloads](https://img.shields.io/npm/dm/@prestomedia/sql-runner.svg?style=flat-square)](https://www.npmjs.com/package/@prestomedia/sql-runner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A transaction-masking, lightweight async utility wrapper built around `mysql2/promise`. It hides the transaction boilerplate. Child functions can participate in a transaction (or not) by simply using a SqlContext parameter.

## Features

- 🌟 **Contextual Transaction Masking:** Minimizes developer error by forcing explicit context passing, preventing out-of-transaction queries.

- 🛡️ **Injection-Safe Utility Tokens:** Includes an exact-match replacement engine to safely pass raw expressions like `UNIX_TIMESTAMP()` within standard parameterized values array without hitting escaping bugs.

- 🪶 **Zero Clutter:** No forced third-party logger dependencies, background execution-time profiling, or any of that stuff.

## Installation

```shell
npm install @prestomedia/sql-runner mysql2
```

Ensure your environment is running Node.js >= 18.0.0.

## Quick Start

Initialize the SqlPool runner using standard mysql2 configuration options.

```typescript
import { SqlPool } from '@prestomedia/sql-runner';

const pool = new SqlPool({
	host: '127.0.0.1',
	user: 'root',
	password: 'your-password',
	database: 'app_db',
	connectionLimit: 10,
});

// Use it anywhere an abstract SqlContext is required
const ctx = pool;
```

## Usage Guide

### Standard Queries

Run clean, promise-based parameterized queries using standard array placeholders.

```typescript
interface User {
	id: number;
	email: string;
}

const users = await ctx.sql.query<User[]>('SELECT id, email FROM users WHERE status = ?', [
	'active',
]);
```

### Lexical Transaction Masking

To prevent developers from accidentally running a query outside of an active transaction, this library leverages variable scoping. By naming the argument ctx inside the closure, you cleanly mask the outer scope.

```typescript
await ctx.sql.transaction(async (ctx) => {
	// Inside this block, 'ctx' securely points to
	// the isolated transaction runner
	const newOrder = await ctx.sql.query(
		'INSERT INTO orders (user_id, total) VALUES (?, ?)',
		[42, 150.0],
	);

	await ctx.sql.query('UPDATE users SET total_orders = total_orders + 1 WHERE id = ?', [42]);
}, ctx); // <-- Pass the parent context in as the second argument
```

ctx.sql.transaction automatically _combines_ nested transactions.

If an error is thrown anywhere inside the closure, a ROLLBACK is executed automatically. If it succeeds, the transaction is gracefully committed.

### Safely Injecting Database Expressions

By default, passing UNIX_TIMESTAMP() inside a parameter array causes mysql2 to wrap it in string quotes, using literal text rather than executing the function.

Use `ctx.sql.UNIX_TIMESTAMP` to inject it cleanly as an expression:

```typescript
await ctx.sql.query('UPDATE users SET updated_at = ? WHERE id = ?', [ctx.sql.UNIX_TIMESTAMP, 42]);

// Evaluates safely to: UPDATE users SET updated_at = UNIX_TIMESTAMP() WHERE id = 42;
```

### Tearing Down the Pool

When running integration test suites or shutting down a microservice process gracefully, always invoke `.end()` to flush connections and let the Node.js event loop terminate cleanly.

```typescript
process.on('SIGTERM', async () => {
	await pool.end();
	process.exit(0);
});
```

## License

Copyright © 2026 Prestomedia, LLC.
Licensed under the MIT License.
