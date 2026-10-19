import type { APIRequestContext } from '@playwright/test';

import { seederUrl } from './api';

/**
 * The seeder's telemetry endpoints. No auth: the seeder is a harness container,
 * so any request context works, including a standalone `request.newContext()`.
 *
 * The seeder has no scoped delete (`DELETE /telemetry/*` truncates everything and
 * belongs to teardown), so seeded rows are never removed per spec. Scope every
 * read by a name the spec stamped.
 */

export type TelemetryPath =
	| '/telemetry/logs'
	| '/telemetry/traces'
	| '/telemetry/metrics';

/** Shape of `Logs.from_dict` in `tests/fixtures/logs.py`. */
export interface SeederLog {
	timestamp: string;
	body: string;
	severity_text?: string;
	resources?: Record<string, string>;
	attributes?: Record<string, unknown>;
}

const ATTEMPTS = 8;
const BACKOFF_MS = 500;
const TIMEOUT_MS = 15_000;

/**
 * POST rows to the seeder. Retries 5xx and transport faults (the seeder's one
 * ClickHouse client returns `500 concurrent queries within the same session`
 * under parallel workers); a 4xx is a wrong payload and fails at once.
 */
export async function postToSeeder(
	request: APIRequestContext,
	path: TelemetryPath,
	rows: unknown[],
	options: { timeout?: number; attempts?: number; backoffMs?: number } = {},
): Promise<void> {
	const attempts = options.attempts ?? ATTEMPTS;
	const backoffMs = options.backoffMs ?? BACKOFF_MS;
	let lastError = '';
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		let status = 0;
		let body = '';
		try {
			// eslint-disable-next-line no-await-in-loop
			const res = await request.post(`${seederUrl()}${path}`, {
				data: rows,
				headers: { 'Content-Type': 'application/json' },
				timeout: options.timeout ?? TIMEOUT_MS,
			});
			if (res.ok()) {
				return;
			}
			status = res.status();
			// eslint-disable-next-line no-await-in-loop
			body = await res.text();
		} catch (error) {
			body = String(error);
		}
		if (status >= 400 && status < 500) {
			throw new Error(
				`seeder POST ${path} rejected the payload, ${status}: ${body}`,
			);
		}
		lastError = status ? `${status}: ${body}` : body;
		if (attempt < attempts) {
			// eslint-disable-next-line no-await-in-loop
			await new Promise((resolve) => {
				setTimeout(resolve, backoffMs * attempt + Math.floor(Math.random() * 100));
			});
		}
	}
	throw new Error(
		`seeder POST ${path} failed after ${attempts} attempts, ${lastError}`,
	);
}

export const seedLogs = (
	request: APIRequestContext,
	logs: SeederLog[],
): Promise<void> => postToSeeder(request, '/telemetry/logs', logs);
