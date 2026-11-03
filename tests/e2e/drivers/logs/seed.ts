import type { APIRequestContext } from '@playwright/test';

import { seeded, type WorkerLayer } from '../kit';
import { seedLogs, type SeederLog } from '../telemetry';

/**
 * The worker's logs, all under one `service.name` the worker owns.
 *
 * No teardown: the seeder cannot delete by marker, and additive rows under a
 * unique service are invisible to every spec that scopes by its own service.
 */

export const RECENT_COUNT = 25;
const RECENT_START_AGO_MS = 150_000;
const RECENT_STEP_MS = 4_000;
const OLD_AGO_MS = 60 * 60_000;
const JSON_AGO_MS = 30_000;
const SEVERITIES = ['INFO', 'WARN', 'ERROR'] as const;

export type LogKind = 'even' | 'odd' | 'old';

export interface LogsSeed {
	service: string;
	/** Every body starts with it. Equal to `service`. */
	marker: string;
	/** `line-NN` bodies, newest first. */
	recent: string[];
	old: string;
	json: string;
	total: number;
	kinds: Record<'even' | 'odd', number>;
}

export const lineBody = (marker: string, index: number): string =>
	`${marker} line-${String(index).padStart(2, '0')}`;

export const serviceFilter = (service: string): string =>
	`service.name = '${service}'`;

const resources = (service: string): Record<string, string> => ({
	'service.name': service,
	'deployment.environment': 'e2e-logs',
});

const iso = (ms: number): string => new Date(ms).toISOString();

export function buildWorkerLogs(
	service: string,
	now = Date.now(),
): SeederLog[] {
	const recent: SeederLog[] = Array.from({ length: RECENT_COUNT }, (_, i) => ({
		timestamp: iso(now - RECENT_START_AGO_MS + i * RECENT_STEP_MS),
		body: lineBody(service, i),
		severity_text: SEVERITIES[i % SEVERITIES.length],
		resources: resources(service),
		attributes: { 'e2e.index': i, 'e2e.kind': i % 2 ? 'odd' : 'even' },
	}));
	return [
		...recent,
		{
			timestamp: iso(now - OLD_AGO_MS),
			body: `${service} old`,
			resources: resources(service),
			attributes: { 'e2e.kind': 'old' },
		},
		{
			timestamp: iso(now - JSON_AGO_MS),
			body: JSON.stringify({ message: `${service} json`, user: { id: 42 } }),
			resources: resources(service),
			attributes: { 'e2e.kind': 'json' },
		},
	];
}

export async function seedWorkerLogs(
	request: APIRequestContext,
	service: string,
): Promise<LogsSeed> {
	await seedLogs(request, buildWorkerLogs(service));
	const recent = Array.from({ length: RECENT_COUNT }, (_, i) =>
		lineBody(service, i),
	).reverse();
	return {
		service,
		marker: service,
		recent,
		old: `${service} old`,
		json: `${service} json`,
		total: RECENT_COUNT + 2,
		kinds: {
			even: Math.ceil(RECENT_COUNT / 2),
			odd: Math.floor(RECENT_COUNT / 2),
		},
	};
}

/**
 * A service of its own for rows a single test adds (live tail, time window), so
 * the worker's counts stay fixed for every other spec in the worker.
 */
export const sideService = (seed: LogsSeed, suffix: string): string =>
	`${seed.service}-${suffix}`;

/** One row under `service`, `offsetMs` from now. */
export async function seedOne(
	request: APIRequestContext,
	service: string,
	body: string,
	offsetMs = 0,
): Promise<void> {
	await seedLogs(request, [
		{
			timestamp: iso(Date.now() + offsetMs),
			body,
			resources: resources(service),
		},
	]);
}

export const withLogsSeed: WorkerLayer<{ logsSeed: LogsSeed }> = seeded(
	'logsSeed',
	async ({ page, workerIndex }) =>
		seedWorkerLogs(page.request, `e2e-logs-w${workerIndex}-${Date.now()}`),
);
