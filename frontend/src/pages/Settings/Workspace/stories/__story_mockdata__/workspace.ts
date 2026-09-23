/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { PayloadProps as DisksPayload } from 'types/api/disks/getDisks';
import type {
	PayloadPropsLogs,
	PayloadPropsMetrics,
	PayloadPropsTraces,
	TStatus,
} from 'types/api/settings/getRetention';

export const RETENTION_STATUSES: TStatus[] = [
	'',
	'pending',
	'success',
	'failed',
];

const HOURS_IN_DAY = 24;

const RETAIN_DAYS = { metrics: 30, traces: 15, logs: 7 };
const MOVE_DAYS = { metrics: 15, traces: 7, logs: 3 };

/** What the status row reports as the pending target, not the current value. */
const EXPECTED_DAYS = { metrics: 90, traces: 45 };

const hours = (days: number): number => days * HOURS_IN_DAY;

export const disksResponse = (coldStorage: boolean): DisksPayload => [
	{ name: 'default', type: 'local' },
	...(coldStorage ? [{ name: 's3', type: 's3' }] : []),
];

export const metricsRetentionResponse = (
	status: TStatus,
	coldStorage: boolean,
): PayloadPropsMetrics => ({
	metrics_ttl_duration_hrs: hours(RETAIN_DAYS.metrics),
	metrics_move_ttl_duration_hrs: coldStorage ? hours(MOVE_DAYS.metrics) : -1,
	status,
	expected_metrics_ttl_duration_hrs: hours(EXPECTED_DAYS.metrics),
	expected_metrics_move_ttl_duration_hrs: coldStorage
		? hours(MOVE_DAYS.metrics)
		: -1,
});

export const tracesRetentionResponse = (
	status: TStatus,
	coldStorage: boolean,
): PayloadPropsTraces => ({
	traces_ttl_duration_hrs: hours(RETAIN_DAYS.traces),
	traces_move_ttl_duration_hrs: coldStorage ? hours(MOVE_DAYS.traces) : -1,
	status,
	expected_traces_ttl_duration_hrs: hours(EXPECTED_DAYS.traces),
	expected_traces_move_ttl_duration_hrs: coldStorage
		? hours(MOVE_DAYS.traces)
		: -1,
});

/** The logs endpoint answers in days, the other two in hours. */
export const logsRetentionResponse = (
	status: TStatus,
	coldStorage: boolean,
): PayloadPropsLogs => ({
	version: 'v2',
	default_ttl_days: RETAIN_DAYS.logs,
	cold_storage_ttl_days: coldStorage ? MOVE_DAYS.logs : -1,
	status,
});

const DEFAULT_HOST = {
	name: 'nightswatch',
	url: 'https://nightswatch.us.signoz.cloud',
	is_default: true,
};

const CUSTOM_HOST = {
	name: 'observability',
	url: 'https://observability.us.signoz.cloud',
	is_default: false,
};

export const WORKSPACE_URLS = ['default', 'custom'] as const;

export type WorkspaceUrl = (typeof WORKSPACE_URLS)[number];

/**
 * The non-default host is the custom domain: the card reads the workspace URL
 * off the first host that is not flagged as the default one.
 */
export const hostsResponse = (
	workspaceUrl: WorkspaceUrl,
): Record<string, unknown> => ({
	status: 'success',
	data: {
		name: DEFAULT_HOST.name,
		state: 'HEALTHY',
		tier: 'production',
		hosts:
			workspaceUrl === 'custom' ? [CUSTOM_HOST, DEFAULT_HOST] : [DEFAULT_HOST],
	},
});
