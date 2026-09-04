/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	GetIntegrationProps,
	GetIntegrationStatusProps,
	IntegrationConnectionStatus,
	IntegrationDetailedProps,
	InstalledIntegrationsSuccessResponse,
} from 'types/api/integrations/types';

import {
	findIntegrationSeed,
	type IntegrationSeed,
	SIGNOZ_AUTHOR,
} from '@/pages/IntegrationsModulePage/__story_mockdata__/integrations';

export const CONNECTION_STATES = [
	'connected',
	'listening',
	'stale',
	'not-installed',
] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];

/**
 * What the page shows is derived, not sent: `getConnectionStatesFromConnectionStatus`
 * reads the installation date and the last-received timestamps and decides
 * between connected, listening, no-data-in-a-while and not-installed. These are
 * the payloads that land on each of the four.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

const installedAt = (
	state: ConnectionState,
): { installed_at: string } | null => {
	if (state === 'not-installed') {
		return null;
	}

	const daysAgo = { connected: 34, listening: 1, stale: 63 }[state];

	return { installed_at: new Date(Date.now() - daysAgo * DAY_MS).toISOString() };
};

/**
 * `last_received_from` is the resource attributes of the last matching record,
 * joined by the connection-status handler, so it reads as a list rather than a
 * host name.
 */
const signalStatus = (
	state: ConnectionState,
	receivedFrom: string,
): IntegrationConnectionStatus['logs'] => {
	if (state === 'connected') {
		return {
			last_received_ts_ms: Date.now() - 2 * 60 * 1000,
			last_received_from: receivedFrom,
		};
	}

	if (state === 'stale') {
		return {
			last_received_ts_ms: Date.now() - 11 * DAY_MS,
			last_received_from: receivedFrom,
		};
	}

	return null;
};

const connectionStatus = (
	seed: IntegrationSeed,
	state: ConnectionState,
): IntegrationConnectionStatus => ({
	logs: seed.signals.logs
		? signalStatus(
				state,
				`host.name=ip-10-4-11-38, os.type=linux, service.name=${seed.id}`,
			)
		: null,
	metrics: seed.signals.metrics
		? signalStatus(
				state,
				`host.name=ip-10-4-11-38, service.name=${seed.id}-exporter`,
			)
		: null,
});

const LOG_FIELDS = [
	{ name: 'Timestamp', path: 'timestamp', type: 'timestamp' },
	{ name: 'Severity Text', path: 'severity_text', type: 'string' },
	{ name: 'Severity Number', path: 'severity_number', type: 'number' },
	{ name: 'Process ID', path: 'attributes.pid', type: 'string' },
	{ name: 'Request Method', path: 'attributes.request_method', type: 'string' },
	{ name: 'Request Path', path: 'attributes.request_path', type: 'string' },
	{ name: 'Response Status Code', path: 'attributes.status', type: 'string' },
	{ name: 'Remote Address', path: 'attributes.remote_addr', type: 'string' },
];

const METRIC_FIELDS = [
	{ suffix: 'operations', type: 'Sum', unit: 'number' },
	{ suffix: 'connections', type: 'Sum', unit: 'number' },
	{ suffix: 'cpu_time', type: 'Sum', unit: 's' },
	{ suffix: 'memory_usage', type: 'Gauge', unit: 'By' },
	{ suffix: 'network_io', type: 'Sum', unit: 'By' },
	{ suffix: 'uptime', type: 'Sum', unit: 's' },
	{ suffix: 'replication_lag', type: 'Gauge', unit: 's' },
	{ suffix: 'errors', type: 'Sum', unit: 'number' },
];

/** `aws_rds_postgresql` exports `postgresql_*`, the way the exporters name them. */
const metricPrefix = (id: string): string => id.split('_').at(-1) ?? id;

const dataCollected = (
	seed: IntegrationSeed,
): { logs: unknown[]; metrics: unknown[] } => ({
	logs: seed.signals.logs ? LOG_FIELDS : [],
	metrics: seed.signals.metrics
		? METRIC_FIELDS.map((metric) => ({
				name: `${metricPrefix(seed.id)}_${metric.suffix}`,
				type: metric.type,
				unit: metric.unit,
			}))
		: [],
});

const overview = (seed: IntegrationSeed): string =>
	[
		`### Monitor ${seed.title} with SigNoz`,
		'',
		`Ship ${seed.signals.metrics ? 'metrics and logs' : 'logs'} from your ${seed.title} instances to SigNoz through the OpenTelemetry Collector. The receiver scrapes the instance, the collector tags the records with the resource they came from, and this page reports when the last one arrived.`,
		'',
		'#### What you get',
		'',
		seed.signals.metrics
			? '- A dashboard over throughput, connections, memory and replication'
			: '- A dashboard over request rate, status codes and upstream latency',
		'- Log parsing that pulls severity and the request fields out of each line',
		'- Connection status on this page, so a misconfigured collector is visible',
	].join('\n');

const configurationSteps = (
	seed: IntegrationSeed,
): { title: string; instructions: string }[] => {
	const steps = [
		{
			title: 'Prerequisites',
			instructions: [
				`- ${seed.title} is reachable from the host running the collector`,
				'- OpenTelemetry Collector v0.88.0 or newer',
				'- A SigNoz ingestion key',
			].join('\n'),
		},
	];

	if (seed.signals.metrics) {
		steps.push({
			title: 'Collect Metrics',
			instructions: [
				`Add the ${metricPrefix(seed.id)} receiver to your collector config:`,
				'',
				'```yaml',
				'receivers:',
				`  ${metricPrefix(seed.id)}:`,
				'    endpoint: localhost:9090',
				'    collection_interval: 60s',
				'```',
			].join('\n'),
		});
	}

	steps.push({
		title: 'Collect Logs',
		instructions: [
			'Point a filelog receiver at the log file and tag it so this page can find it:',
			'',
			'```yaml',
			'receivers:',
			'  filelog:',
			`    include: ['/var/log/${metricPrefix(seed.id)}/*.log']`,
			'    operators:',
			'      - type: add',
			'        field: attributes.source',
			`        value: ${seed.id}`,
			'```',
		].join('\n'),
	});

	return steps;
};

/**
 * `types/api/integrations/types.ts` types `configuration` as a one-element
 * tuple, `assets.dashboards` as an empty one and `data_collected` as lists of
 * strings, while the API sends N configuration steps and objects the Data
 * Collected table reads `name`, `path`, `type` and `unit` off. The payload is
 * built the way the API sends it and cast to the app's type.
 */
const integrationDetail = (
	seed: IntegrationSeed,
	state: ConnectionState,
): IntegrationDetailedProps =>
	({
		id: seed.id,
		title: seed.title,
		description: seed.description,
		icon: seed.icon,
		author: SIGNOZ_AUTHOR,
		categories: seed.categories,
		installation: installedAt(state),
		connection_status: connectionStatus(seed, state),
		assets: {
			logs: { pipelines: [] },
			dashboards: seed.signals.metrics
				? [{ id: `${seed.id}-overview`, title: `${seed.title} overview` }]
				: [],
			alerts: [],
		},
		overview: overview(seed),
		configuration: configurationSteps(seed),
		data_collected: dataCollected(seed),
	}) as IntegrationDetailedProps;

/**
 * Where the story's install state lives. The Connection control owns it: the
 * mocks' `effect` puts it back to what the control says on every story render,
 * and the install and uninstall handlers move it, so Connect and Remove change
 * the page instead of being answered by the control again.
 */
let installState: ConnectionState = 'connected';

export const setInstallState = (state: ConnectionState): void => {
	installState = state;
};

export const integrationResponse = (id: string): GetIntegrationProps => ({
	data: integrationDetail(findIntegrationSeed(id), installState),
});

export const integrationStatusResponse = (
	id: string,
): GetIntegrationStatusProps => ({
	data: connectionStatus(findIntegrationSeed(id), installState),
});

export const installedResponse = (
	id: string,
): { status: string; data: InstalledIntegrationsSuccessResponse['data'] } => {
	const seed = findIntegrationSeed(id);

	return {
		status: 'success',
		data: {
			id: seed.id,
			title: seed.title,
			description: seed.description,
			icon: seed.icon,
			author: SIGNOZ_AUTHOR,
			is_installed: true,
		},
	};
};

export const uninstalledResponse = (): { status: string; data: null } => ({
	status: 'success',
	data: null,
});
