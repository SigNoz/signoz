/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	GatewaytypesIngestionKeyDTO,
	GatewaytypesLimitDTO,
	GetIngestionKeys200,
} from 'api/generated/services/sigNoz.schemas';
import type { IngestionInfo } from 'types/api/settings/ingestion';

/** `per_page` the page asks for, so a longer page is a body the gateway never sends. */
export const KEYS_PER_PAGE = 10;

export const LIMIT_SIGNALS = ['logs', 'traces', 'metrics'] as const;

export type LimitSignal = (typeof LIMIT_SIGNALS)[number];

export const EXPIRIES = ['none', 'soon', 'expired'] as const;

export type Expiry = (typeof EXPIRIES)[number];

const KEY_NAMES = [
	'production-us-east',
	'production-eu-west',
	'staging',
	'load-test',
	'edge-collectors',
	'k8s-daemonset',
	'lambda-forwarder',
	'batch-jobs',
	'partner-sandbox',
	'legacy-agents',
];

const DAY = 24 * 60 * 60 * 1000;
const GIB = 1024 * 1024 * 1024;

/** Fixed epoch so the created and updated columns do not move between renders. */
const CREATED_AT = Date.UTC(2026, 0, 21, 10, 0);

/** The gateway's zero date, which the column reads as "No Expiry". */
const NEVER = '0001-01-01T00:00:00.000Z';

const expiresAt = (expiry: Expiry, index: number): string => {
	switch (expiry) {
		case 'soon':
			return new Date(Date.now() + (index + 2) * DAY).toISOString();

		case 'expired':
			return new Date(CREATED_AT - DAY).toISOString();

		default:
			return NEVER;
	}
};

/** Logs and traces are limited on bytes, metrics on datapoints. */
const limit = (
	signal: LimitSignal,
	keyId: string,
	index: number,
): GatewaytypesLimitDTO => ({
	id: `limit-${keyId}-${signal}`,
	key_id: keyId,
	signal,
	config:
		signal === 'metrics'
			? { day: { count: 500_000_000 }, second: { count: 20_000 } }
			: { day: { size: (index + 1) * 200 * GIB }, second: { size: 8 * GIB } },
	metric:
		signal === 'metrics'
			? { day: { count: 187_400_000 }, second: { count: 6_400 } }
			: { day: { size: (index + 1) * 96 * GIB }, second: { size: 2 * GIB } },
	created_at: new Date(CREATED_AT).toISOString(),
	updated_at: new Date(CREATED_AT).toISOString(),
});

const ingestionKey = (
	index: number,
	signals: readonly LimitSignal[],
	expiry: Expiry,
): GatewaytypesIngestionKeyDTO => {
	const id = `ingestion-key-${index}`;

	return {
		id,
		name: KEY_NAMES[index % KEY_NAMES.length],
		value: `sk_${index}${'x'.repeat(28)}${index}9`,
		workspace_id: 'story-workspace',
		tags: index === 0 ? ['production', 'us-east-1'] : [],
		limits: signals.map((signal) => limit(signal, id, index)),
		created_at: new Date(CREATED_AT - index * DAY).toISOString(),
		updated_at: new Date(CREATED_AT - index * DAY + 3600_000).toISOString(),
		expires_at: expiresAt(expiry, index),
	};
};

export const ingestionKeysResponse = (
	keys: number,
	signals: readonly LimitSignal[],
	expiry: Expiry,
	page: number,
): GetIngestionKeys200 => ({
	status: 'success',
	data: {
		keys: Array.from({ length: keys }, (_, index) =>
			ingestionKey(index, signals, expiry),
		),
		_pagination: {
			page,
			per_page: KEYS_PER_PAGE,
			total: keys,
			pages: Math.max(1, Math.ceil(keys / KEYS_PER_PAGE)),
		},
	},
});

/**
 * The pre-gateway endpoint, which answers with one record and no limits: the tab
 * falls back to it when the gateway feature is off.
 *
 * The body is the bare array. `IngestionResponseProps` says the records sit
 * under a `payload` key, but `getIngestionData` already puts the whole body
 * there and the tab indexes into it, so a wrapped body renders three blank rows.
 */
export const legacyIngestionResponse = (): IngestionInfo[] => [
	{
		keyId: 'ingestion-key-0',
		name: KEY_NAMES[0],
		createdAt: new Date(CREATED_AT).toISOString(),
		ingestionKey: 'sk_0xxxxxxxxxxxxxxxxxxxxxxxxxxx09',
		ingestionURL: 'https://ingest.us.signoz.cloud:443',
		dataRegion: 'us-east-1',
	},
];
