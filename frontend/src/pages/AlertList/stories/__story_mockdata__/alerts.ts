/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	MetrictypesSpaceAggregationDTO,
	MetrictypesTemporalityDTO,
	MetrictypesTimeAggregationDTO,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal as MetricsSignal,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
	Querybuildertypesv5ReduceToDTO,
	RuletypesAlertStateDTO,
	RuletypesAlertTypeDTO,
	RuletypesCompareOperatorDTO,
	RuletypesMatchTypeDTO,
	RuletypesPanelTypeDTO,
	RuletypesQueryTypeDTO,
	RuletypesRuleTypeDTO,
	RuletypesThresholdBasicDTOKind,
	type AlertmanagertypesDeprecatedGettableAlertDTO,
	type GetAlerts200,
	type GetRuleByID200,
	type ListRules200,
	type RuletypesAlertCompositeQueryDTO,
	type RuletypesRuleConditionDTO,
	type RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { NEW_ALERT_SCHEMA_VERSION } from 'types/api/alerts/alertTypesV2';
import type { Channels } from 'types/api/channels/getAll';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (ms: number): string => new Date(Date.now() - ms).toISOString();

export const ALERT_SEVERITIES = [
	'critical',
	'error',
	'warning',
	'info',
] as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

/** `mixed` spreads the seeds' own severities instead of forcing one. */
export const SEVERITY_CHOICES = ['mixed', ...ALERT_SEVERITIES] as const;

export type SeverityChoice = (typeof SEVERITY_CHOICES)[number];

export const RULE_STATES = [
	'firing',
	'pending',
	'inactive',
	'disabled',
	'nodata',
] as const;

export type RuleState = (typeof RULE_STATES)[number];

export const RULE_STATE_CHOICES = ['mixed', ...RULE_STATES] as const;

export type RuleStateChoice = (typeof RULE_STATE_CHOICES)[number];

export const ALERT_SCHEMAS = ['v2', 'classic'] as const;

export type AlertSchema = (typeof ALERT_SCHEMAS)[number];

export const CHANNEL_TYPES = [
	'slack',
	'webhook',
	'pagerduty',
	'opsgenie',
	'email',
	'msteams',
	'googlechat',
	'jira',
	'jsmops',
	'incidentio',
] as const;

export type ChannelType = (typeof CHANNEL_TYPES)[number];

/**
 * One query envelope is enough for the alert form to mount its query builder
 * over the rule, and it is the query the preview chart is drawn for.
 */
const compositeQuery = (seed: RuleSeed): RuletypesAlertCompositeQueryDTO => ({
	queryType: RuletypesQueryTypeDTO.builder,
	panelType: RuletypesPanelTypeDTO.graph,
	unit: seed.unit,
	queries: [
		{
			type: Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
			spec: {
				name: 'A',
				signal: MetricsSignal.metrics,
				disabled: false,
				aggregations: [
					{
						metricName: seed.metric,
						temporality: MetrictypesTemporalityDTO.unspecified,
						timeAggregation: MetrictypesTimeAggregationDTO.avg,
						spaceAggregation: MetrictypesSpaceAggregationDTO.avg,
						reduceTo: Querybuildertypesv5ReduceToDTO.last,
					},
				],
				filter: { expression: '' },
				groupBy: [],
				order: [],
				stepInterval: 60,
			},
		},
	],
});

const condition = (seed: RuleSeed): RuletypesRuleConditionDTO => ({
	compositeQuery: compositeQuery(seed),
	op: RuletypesCompareOperatorDTO.above,
	matchType: RuletypesMatchTypeDTO.at_least_once,
	selectedQueryName: 'A',
	target: seed.target,
	targetUnit: seed.unit,
	alertOnAbsent: false,
	requireMinPoints: false,
	thresholds: {
		kind: RuletypesThresholdBasicDTOKind.basic,
		spec: [
			{
				name: 'critical',
				matchType: RuletypesMatchTypeDTO.at_least_once,
				op: RuletypesCompareOperatorDTO.above,
				target: seed.target,
				targetUnit: seed.unit,
				channels: ['ops-slack'],
			},
		],
	},
});

interface RuleSeed {
	alert: string;
	alertType: RuletypesAlertTypeDTO;
	state: RuletypesAlertStateDTO;
	severity: AlertSeverity;
	labels: Record<string, string>;
	metric: string;
	unit: string;
	target: number;
}

const RULE_SEEDS: RuleSeed[] = [
	{
		alert: 'Node CPU saturation',
		alertType: RuletypesAlertTypeDTO.METRIC_BASED_ALERT,
		state: RuletypesAlertStateDTO.firing,
		severity: 'critical',
		labels: { team: 'platform', env: 'prod' },
		metric: 'system_cpu_utilization',
		unit: 'percent',
		target: 85,
	},
	{
		alert: 'Checkout API latency above 2s',
		alertType: RuletypesAlertTypeDTO.TRACES_BASED_ALERT,
		state: RuletypesAlertStateDTO.firing,
		severity: 'critical',
		labels: { team: 'checkout', env: 'prod' },
		metric: 'http_server_duration',
		unit: 'ms',
		target: 2000,
	},
	{
		alert: 'Payment service error rate',
		alertType: RuletypesAlertTypeDTO.TRACES_BASED_ALERT,
		state: RuletypesAlertStateDTO.pending,
		severity: 'critical',
		labels: { team: 'payments', env: 'prod' },
		metric: 'http_server_duration',
		unit: 'percent',
		target: 5,
	},
	{
		alert: 'Kafka consumer lag',
		alertType: RuletypesAlertTypeDTO.METRIC_BASED_ALERT,
		state: RuletypesAlertStateDTO.pending,
		severity: 'error',
		labels: { team: 'platform', component: 'kafka' },
		metric: 'kafka_consumer_lag',
		unit: '',
		target: 10_000,
	},
	{
		alert: 'Postgres connections near limit',
		alertType: RuletypesAlertTypeDTO.METRIC_BASED_ALERT,
		state: RuletypesAlertStateDTO.inactive,
		severity: 'warning',
		labels: { team: 'platform', component: 'database' },
		metric: 'postgresql_backends',
		unit: '',
		target: 90,
	},
	{
		alert: 'Auth service 5xx spike',
		alertType: RuletypesAlertTypeDTO.LOGS_BASED_ALERT,
		state: RuletypesAlertStateDTO.inactive,
		severity: 'error',
		labels: { team: 'identity', env: 'prod' },
		metric: 'http_server_duration',
		unit: '',
		target: 20,
	},
	{
		alert: 'Unhandled exceptions in web',
		alertType: RuletypesAlertTypeDTO.EXCEPTIONS_BASED_ALERT,
		state: RuletypesAlertStateDTO.firing,
		severity: 'error',
		labels: { team: 'web', env: 'prod' },
		metric: 'http_server_duration',
		unit: '',
		target: 15,
	},
	{
		alert: 'Ingest pipeline dropped logs',
		alertType: RuletypesAlertTypeDTO.LOGS_BASED_ALERT,
		state: RuletypesAlertStateDTO.nodata,
		severity: 'warning',
		labels: { team: 'platform', component: 'collector' },
		metric: 'system_memory_usage',
		unit: '',
		target: 1,
	},
	{
		alert: 'Nightly batch job overran',
		alertType: RuletypesAlertTypeDTO.TRACES_BASED_ALERT,
		state: RuletypesAlertStateDTO.disabled,
		severity: 'info',
		labels: { team: 'data' },
		metric: 'http_server_duration',
		unit: 's',
		target: 3600,
	},
	{
		alert: 'Search p99 above budget',
		alertType: RuletypesAlertTypeDTO.TRACES_BASED_ALERT,
		state: RuletypesAlertStateDTO.inactive,
		severity: 'info',
		labels: { team: 'search', env: 'staging' },
		metric: 'http_server_duration',
		unit: 'ms',
		target: 800,
	},
	{
		alert: 'Cache hit ratio dropped',
		alertType: RuletypesAlertTypeDTO.METRIC_BASED_ALERT,
		state: RuletypesAlertStateDTO.inactive,
		severity: 'info',
		labels: { team: 'platform', component: 'redis' },
		metric: 'system_memory_usage',
		unit: 'percent',
		target: 70,
	},
	{
		alert: 'Disk usage on ingesters',
		alertType: RuletypesAlertTypeDTO.METRIC_BASED_ALERT,
		state: RuletypesAlertStateDTO.pending,
		severity: 'critical',
		labels: { team: 'platform', env: 'prod' },
		metric: 'system_memory_usage',
		unit: 'percent',
		target: 92,
	},
];

export const RULE_MAX = RULE_SEEDS.length;

/** The rule `rule-1` resolves to, which is the one the detail stories open. */
export const FIRST_RULE_NAME = RULE_SEEDS[0].alert;

const seedAt = (index: number): RuleSeed =>
	RULE_SEEDS[index % RULE_SEEDS.length];

const ruleName = (index: number): string => {
	const seed = seedAt(index);
	const round = Math.floor(index / RULE_SEEDS.length);

	return round === 0 ? seed.alert : `${seed.alert} (${round + 1})`;
};

export interface RuleShape {
	severity: SeverityChoice;
	state: RuleStateChoice;
	schema?: AlertSchema;
}

const buildRule = (index: number, shape: RuleShape): RuletypesRuleDTO => {
	const seed = seedAt(index);
	const severity = shape.severity === 'mixed' ? seed.severity : shape.severity;
	const state =
		shape.state === 'mixed'
			? seed.state
			: (shape.state as RuletypesAlertStateDTO);

	return {
		id: `rule-${index + 1}`,
		alert: ruleName(index),
		alertType: seed.alertType,
		ruleType: RuletypesRuleTypeDTO.threshold_rule,
		state,
		disabled: state === RuletypesAlertStateDTO.disabled,
		condition: condition(seed),
		labels: { severity, ...seed.labels },
		annotations: {
			summary: `${seed.alert} crossed its threshold of ${seed.target}`,
			description:
				'The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}',
		},
		evalWindow: '5m0s',
		frequency: '1m0s',
		createdAt: ago((index + 3) * DAY),
		updatedAt: ago((index + 1) * HOUR),
		createdBy: 'ada@signoz.io',
		updatedBy: 'grace@signoz.io',
		schemaVersion:
			shape.schema === 'classic' ? undefined : NEW_ALERT_SCHEMA_VERSION,
		version: 'v5',
		source: 'http://localhost/alerts',
		preferredChannels: ['ops-slack'],
		notificationSettings: {
			groupBy: ['alertname'],
			usePolicy: false,
			renotify: { enabled: false, interval: '30m0s' },
		},
	};
};

export const alertRulesResponse = (
	count: number,
	shape: RuleShape,
): ListRules200 => ({
	status: 'success',
	data: Array.from({ length: count }, (_unused, index) =>
		buildRule(index, shape),
	),
});

/**
 * The detail endpoint answers for whatever id the URL carries, so a story keeps
 * rendering after a row click lands on a rule the list never returned.
 */
export const alertRuleByIdResponse = (
	ruleId: string,
	shape: RuleShape,
): GetRuleByID200 => {
	const index = Math.max(Number.parseInt(ruleId.replace(/\D/g, ''), 10) - 1, 0);

	return {
		status: 'success',
		data: { ...buildRule(Number.isNaN(index) ? 0 : index, shape), id: ruleId },
	};
};

interface TriggeredSeed {
	alertname: string;
	severity: AlertSeverity;
	labels: Record<string, string>;
	summary: string;
	firingForMinutes: number;
}

const TRIGGERED_SEEDS: TriggeredSeed[] = [
	{
		alertname: 'Checkout API latency above 2s',
		severity: 'critical',
		labels: { service: 'checkout', env: 'prod', team: 'checkout' },
		summary: 'p99 latency is 3.4s against a 2s budget',
		firingForMinutes: 14,
	},
	{
		alertname: 'Payment service error rate',
		severity: 'critical',
		labels: { service: 'payments', env: 'prod', team: 'payments' },
		summary: '7.2% of payment spans failed in the last 5 minutes',
		firingForMinutes: 42,
	},
	{
		alertname: 'Node CPU saturation',
		severity: 'warning',
		labels: { service: 'kubelet', env: 'prod', team: 'platform' },
		summary: 'CPU utilisation held above 85% on 3 nodes',
		firingForMinutes: 128,
	},
	{
		alertname: 'Kafka consumer lag',
		severity: 'error',
		labels: { service: 'events-consumer', env: 'prod', team: 'platform' },
		summary: 'Lag is 24k messages and climbing',
		firingForMinutes: 300,
	},
	{
		alertname: 'Unhandled exceptions in web',
		severity: 'error',
		labels: { service: 'web', env: 'prod', team: 'web' },
		summary: '31 unhandled exceptions in the last 10 minutes',
		firingForMinutes: 8,
	},
	{
		alertname: 'Auth service 5xx spike',
		severity: 'error',
		labels: { service: 'auth', env: 'prod', team: 'identity' },
		summary: '5xx rate is 22 requests per second',
		firingForMinutes: 55,
	},
	{
		alertname: 'Search p99 above budget',
		severity: 'info',
		labels: { service: 'search', env: 'staging', team: 'search' },
		summary: 'p99 is 940ms against an 800ms budget',
		firingForMinutes: 1_450,
	},
	{
		alertname: 'Cache hit ratio dropped',
		severity: 'info',
		labels: { service: 'redis', env: 'prod', team: 'platform' },
		summary: 'Hit ratio fell to 61%',
		firingForMinutes: 620,
	},
	{
		alertname: 'Disk usage on ingesters',
		severity: 'critical',
		labels: { service: 'ingester', env: 'prod', team: 'platform' },
		summary: 'Two ingesters are above 92% disk',
		firingForMinutes: 3,
	},
	{
		alertname: 'Postgres connections near limit',
		severity: 'warning',
		labels: { service: 'postgres', env: 'prod', team: 'platform' },
		summary: '91% of the connection pool is in use',
		firingForMinutes: 240,
	},
	{
		alertname: 'Ingest pipeline dropped logs',
		severity: 'warning',
		labels: { service: 'otel-collector', env: 'prod', team: 'platform' },
		summary: 'The collector dropped 4.1k log records',
		firingForMinutes: 76,
	},
	{
		alertname: 'Nightly batch job overran',
		severity: 'info',
		labels: { service: 'batch-runner', env: 'prod', team: 'data' },
		summary: 'The nightly job ran 41 minutes past its window',
		firingForMinutes: 900,
	},
];

export const TRIGGERED_ALERT_MAX = TRIGGERED_SEEDS.length;

/** A resolved alert is one alertmanager still lists with an `endsAt` in the past. */
export const TRIGGERED_STATES = ['mixed', 'active', 'suppressed'] as const;

export type TriggeredState = (typeof TRIGGERED_STATES)[number];

export interface TriggeredShape {
	severity: SeverityChoice;
	state: TriggeredState;
}

const buildTriggeredAlert = (
	index: number,
	shape: TriggeredShape,
): AlertmanagertypesDeprecatedGettableAlertDTO => {
	const seed = TRIGGERED_SEEDS[index % TRIGGERED_SEEDS.length];
	const severity = shape.severity === 'mixed' ? seed.severity : shape.severity;
	const mixedState = index % 4 === 3 ? 'suppressed' : 'active';
	const state = shape.state === 'mixed' ? mixedState : shape.state;
	const ruleId = `rule-${(index % RULE_MAX) + 1}`;

	return {
		fingerprint: `fingerprint-${index + 1}`,
		startsAt: ago(seed.firingForMinutes * MINUTE),
		endsAt: new Date(Date.now() + HOUR).toISOString(),
		generatorURL: `http://localhost/alerts/overview?ruleId=${ruleId}`,
		labels: {
			alertname: seed.alertname,
			severity,
			ruleId,
			...seed.labels,
		},
		annotations: {
			summary: seed.summary,
			description: `${seed.alertname} has been firing for ${seed.firingForMinutes} minutes`,
		},
		status: {
			state,
			silencedBy: state === 'suppressed' ? ['silence-1'] : [],
			inhibitedBy: [],
		},
		receivers: ['ops-slack'],
	};
};

export const triggeredAlertsResponse = (
	count: number,
	shape: TriggeredShape,
): GetAlerts200 => ({
	status: 'success',
	data: Array.from({ length: count }, (_unused, index) =>
		buildTriggeredAlert(index, shape),
	),
});

interface ChannelSeed {
	name: string;
	type: ChannelType;
	/** The alertmanager receiver the channel serialises into its `data` field. */
	receiver: Record<string, unknown>;
}

const CHANNEL_SEEDS: ChannelSeed[] = [
	{
		name: 'ops-slack',
		type: 'slack',
		receiver: {
			slack_configs: [
				{
					api_url: 'https://hooks.slack.com/services/T000/B000/story-token',
					channel: '#ops-alerts',
					send_resolved: true,
					title: '[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}',
					text: '{{ range .Alerts -}}*Alert:* {{ .Labels.alertname }}\n{{ end }}',
				},
			],
		},
	},
	{
		name: 'oncall-pagerduty',
		type: 'pagerduty',
		receiver: {
			pagerduty_configs: [
				{
					routing_key: 'story-routing-key',
					send_resolved: true,
					client: 'SigNoz',
					description: '{{ .CommonLabels.alertname }}',
					severity: 'critical',
					details: { firing: '{{ .Alerts.Firing | len }}' },
				},
			],
		},
	},
	{
		name: 'platform-webhook',
		type: 'webhook',
		receiver: {
			webhook_configs: [
				{
					url: 'https://hooks.example.com/signoz',
					send_resolved: true,
					http_config: {
						basic_auth: { username: 'signoz', password: 'story-password' },
					},
				},
			],
		},
	},
	{
		name: 'sre-email',
		type: 'email',
		receiver: {
			email_configs: [
				{
					to: 'sre@signoz.io',
					send_resolved: true,
					html: '<p>{{ .CommonLabels.alertname }}</p>',
					headers: { Subject: '[SigNoz] {{ .CommonLabels.alertname }}' },
				},
			],
		},
	},
	{
		name: 'incident-opsgenie',
		type: 'opsgenie',
		receiver: {
			opsgenie_configs: [
				{
					api_key: 'story-api-key',
					send_resolved: true,
					message: '{{ .CommonLabels.alertname }}',
					description: '{{ .CommonLabels.alertname }} is firing',
					priority: 'P2',
				},
			],
		},
	},
	{
		name: 'eng-msteams',
		type: 'msteams',
		receiver: {
			msteamsv2_configs: [
				{
					webhook_url: 'https://signoz.webhook.office.com/story',
					send_resolved: true,
					title: '{{ .CommonLabels.alertname }}',
					text: '{{ .CommonAnnotations.summary }}',
				},
			],
		},
	},
	{
		name: 'support-googlechat',
		type: 'googlechat',
		receiver: {
			googlechat_configs: [
				{
					webhook_url: 'https://chat.googleapis.com/v1/spaces/story',
					send_resolved: true,
					title: '{{ .CommonLabels.alertname }}',
					description: '{{ .CommonAnnotations.summary }}',
				},
			],
		},
	},
	{
		name: 'tickets-jira',
		type: 'jira',
		receiver: {
			jira_configs: [
				{
					site: 'https://signoz.atlassian.net',
					project: 'ALERT',
					issue_type: 'Task',
					send_resolved: true,
					summary: '{{ .CommonLabels.alertname }}',
					description: '{{ .CommonAnnotations.summary }}',
					priority: 'High',
					labels: ['signoz', 'platform'],
					resolve_transition: 'Done',
					reopen_transition: 'Reopen',
					wont_fix_resolution: "Won't Do",
					reopen_duration: '72h',
					// The form reads the credentials off the basic auth block rather than
					// off the config itself, which is where the backend stores them.
					http_config: {
						basic_auth: {
							username: 'alerts@signoz.io',
							password: 'story-api-token',
						},
					},
				},
			],
		},
	},
	{
		name: 'oncall-jsmops',
		type: 'jsmops',
		receiver: {
			jsmops_configs: [
				{
					api_key: 'story-jsm-api-key',
					send_resolved: true,
					message: '{{ .CommonLabels.alertname }}',
					description: '{{ .CommonAnnotations.summary }}',
					priority: 'P2',
					// Stored comma-separated, which is what the form splits into chips.
					tags: 'signoz,platform',
				},
			],
		},
	},
	{
		name: 'oncall-incidentio',
		type: 'incidentio',
		receiver: {
			incidentio_configs: [
				{
					url: 'https://api.incident.io/v2/alert_events/http/story-source-config-id',
					token: 'story-source-token',
					send_resolved: true,
					title: '{{ .CommonLabels.alertname }}',
					description: '{{ .CommonAnnotations.summary }}',
					metadata: { team: 'platform' },
				},
			],
		},
	},
];

export const CHANNEL_MAX = CHANNEL_SEEDS.length;

const buildChannel = (index: number): Channels => {
	const seed = CHANNEL_SEEDS[index % CHANNEL_SEEDS.length];

	return {
		id: String(index + 1),
		name: seed.name,
		type: seed.type,
		created_at: ago((index + 10) * DAY),
		updated_at: ago((index + 1) * DAY),
		data: JSON.stringify({ name: seed.name, ...seed.receiver }),
	};
};

export const channelsResponse = (
	count: number,
): { status: string; data: Channels[] } => ({
	status: 'success',
	data: Array.from({ length: count }, (_unused, index) => buildChannel(index)),
});

/** Channel names the alert form and the routing policies pick from. */
export const channelNames = (count: number): string[] =>
	channelsResponse(count).data.map((channel) => channel.name);

export const channelResponse = (
	id: string,
	type: ChannelType,
): { status: string; data: Channels } => {
	const index = CHANNEL_SEEDS.findIndex((seed) => seed.type === type);

	return {
		status: 'success',
		data: { ...buildChannel(Math.max(index, 0)), id },
	};
};
