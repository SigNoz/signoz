import { FeatureKeys } from 'constants/features';
import { ORG_PREFERENCES } from 'constants/orgPreferences';
import { checkListStepToPreferenceKeyMap } from 'container/Home/constants';
import type { RuletypesRuleDTO } from 'api/generated/services/sigNoz.schemas';
import type { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { explorerView } from 'mocks-server/__mockdata__/explorer_views';
import { defaultFeatureFlags } from 'tests/fixtures/appContextMock';
import type { FeatureFlagProps } from 'types/api/features/getFeaturesFlags';
import type { MetricRangePayloadV3 } from 'types/api/metrics/getQueryRange';
import type { ServicesList } from 'types/api/metrics/getService';
import type { UserPreference } from 'types/api/preferences/preference';

import { baseUserPreferences } from '@/storybook/msw/__story_mockdata__/appShell';
import { queryRangeV5ScalarResponse } from '@/storybook/msw/__story_mockdata__/queryRange';

export { queryRangeV5ScalarResponse };

/** Shapes follow the fields the components read, not the full generated DTOs. */

export const metricsOnboardingResponse = (
	hasMetrics: boolean,
): Record<string, unknown> => ({
	status: 'success',
	data: { hasMetrics },
});

export const HOME_CHECKLIST_STEPS = [
	'SEND_LOGS',
	'SEND_TRACES',
	'SEND_METRICS',
	'SETUP_ALERTS',
	'SETUP_SAVED_VIEWS',
	'SETUP_DASHBOARDS',
] as const;

export type HomeChecklistStep = (typeof HOME_CHECKLIST_STEPS)[number];

const skippedPreference = (name: string): UserPreference => ({
	name,
	description: 'Welcome checklist step skipped',
	valueType: 'boolean',
	defaultValue: false,
	allowedValues: ['true', 'false'],
	allowedScopes: ['org'],
	value: true,
});

/**
 * The welcome checklist reads its dismissed and skipped flags off the user
 * preferences list, one entry per step.
 */
export const homeUserPreferences = ({
	checklistDismissed,
	skippedSteps,
}: {
	checklistDismissed: boolean;
	skippedSteps: readonly HomeChecklistStep[];
}): UserPreference[] => [
	...baseUserPreferences,
	...(checklistDismissed
		? [skippedPreference(ORG_PREFERENCES.WELCOME_CHECKLIST_DO_LATER)]
		: []),
	...skippedSteps.map((step) =>
		skippedPreference(checkListStepToPreferenceKeyMap[step]),
	),
];

const DASHBOARDS = [
	{
		name: 'Kubernetes cluster health',
		tags: [{ key: 'team', value: 'platform' }, { key: 'k8s' }],
	},
	{ name: 'API latency overview', tags: [{ key: 'sre' }] },
	{
		name: 'Checkout funnel',
		tags: [{ key: 'team', value: 'payments' }, { key: 'business' }],
	},
	{ name: 'Postgres slow queries', tags: [{ key: 'database' }] },
	{
		name: 'Kafka consumer lag',
		tags: [{ key: 'team', value: 'data' }, { key: 'streaming' }],
	},
	{ name: 'Ingress error budget', tags: [{ key: 'sre' }, { key: 'slo' }] },
	{ name: 'Cost per service', tags: [{ key: 'finops' }] },
	{
		name: 'Redis cache hit rate',
		tags: [{ key: 'database' }, { key: 'cache' }],
	},
];

export const recentDashboardsResponse = (
	count: number,
): Record<string, unknown> => ({
	status: 'success',
	data: {
		dashboards: DASHBOARDS.slice(0, count).map((dashboard, index) => ({
			id: `storybook-dashboard-${index + 1}`,
			name: dashboard.name,
			spec: { display: { name: dashboard.name } },
			tags: dashboard.tags,
		})),
	},
});

const ALERT_NAMES = [
	'Checkout p99 above 2s',
	'Payment failure rate',
	'Log volume spike',
	'Kafka consumer lag',
	'Pod restart storm',
	'Disk usage above 85%',
	'Frontend error rate',
	'Postgres connections saturated',
];

/**
 * Cycles the jest fixtures so the list keeps their severity and firing spread.
 * `updatedAt` descends because that is the order the page sorts on.
 */
export const buildAlertRules = (count: number): RuletypesRuleDTO[] =>
	Array.from({ length: count }, (_, index) => ({
		...alertRulesFixture[index % alertRulesFixture.length],
		id: `storybook-rule-${index + 1}`,
		alert: ALERT_NAMES[index % ALERT_NAMES.length],
		updatedAt: new Date(Date.UTC(2026, 7, 20 - index, 9)).toISOString(),
	}));

export const SAVED_VIEW_SIGNALS = ['logs', 'traces', 'metrics'] as const;

export type SavedViewSignal = (typeof SAVED_VIEW_SIGNALS)[number];

const VIEW_NAMES: Record<SavedViewSignal, string[]> = {
	logs: [
		'Checkout errors',
		'Auth service warnings',
		'Slow SQL statements',
		'Payment webhooks',
		'Rate limited requests',
		'Cron job failures',
	],
	traces: [
		'Slowest checkout spans',
		'Failed payment traces',
		'Cart to order funnel',
		'External API calls',
		'Cold start requests',
		'Retried gRPC calls',
	],
	metrics: [
		'Pod memory by namespace',
		'Queue depth by topic',
		'HTTP throughput',
		'Container CPU throttling',
		'JVM heap usage',
		'Cache hit ratio',
	],
};

export const isSavedViewSignal = (value: string): value is SavedViewSignal =>
	SAVED_VIEW_SIGNALS.includes(value as SavedViewSignal);

export const savedViewsResponse = (
	count: number,
	sourcePage: SavedViewSignal,
): Record<string, unknown> => {
	const names = VIEW_NAMES[sourcePage];

	return {
		status: 'success',
		data: Array.from({ length: Math.min(count, names.length) }, (_, index) => ({
			...explorerView.data[0],
			id: `storybook-${sourcePage}-view-${index + 1}`,
			name: names[index],
			sourcePage,
			tags: [sourcePage],
		})),
	};
};

/** Ordered by p99 with errors at both ends, so any slice keeps the spread. */
const SERVICES: ServicesList[] = [
	{
		serviceName: 'payments',
		p99: 2_940_100_000,
		avgDuration: 921_440_000,
		numCalls: 46_080,
		callRate: 25.6,
		numErrors: 5990,
		errorRate: 13,
	},
	{
		serviceName: 'checkout',
		p99: 1_248_900_000,
		avgDuration: 486_310_000,
		numCalls: 92_160,
		callRate: 51.2,
		numErrors: 4608,
		errorRate: 5,
	},
	{
		serviceName: 'frontend',
		p99: 812_450_000,
		avgDuration: 274_120_000,
		numCalls: 184_320,
		callRate: 102.4,
		numErrors: 1843,
		errorRate: 1,
	},
	{
		serviceName: 'shipping',
		p99: 486_200_000,
		avgDuration: 192_800_000,
		numCalls: 23_040,
		callRate: 12.8,
		numErrors: 691,
		errorRate: 3,
	},
	{
		serviceName: 'cart',
		p99: 214_800_000,
		avgDuration: 88_640_000,
		numCalls: 138_240,
		callRate: 76.8,
		numErrors: 0,
		errorRate: 0,
	},
	{
		serviceName: 'catalogue',
		p99: 96_300_000,
		avgDuration: 41_220_000,
		numCalls: 276_480,
		callRate: 153.6,
		numErrors: 276,
		errorRate: 0.1,
	},
	{
		serviceName: 'recommendations',
		p99: 64_100_000,
		avgDuration: 28_400_000,
		numCalls: 61_440,
		callRate: 34.1,
		numErrors: 61,
		errorRate: 0.1,
	},
	{
		serviceName: 'notifications',
		p99: 38_700_000,
		avgDuration: 15_900_000,
		numCalls: 12_288,
		callRate: 6.8,
		numErrors: 0,
		errorRate: 0,
	},
];

export const buildServices = (count: number): ServicesList[] =>
	SERVICES.slice(0, count);

export const SERVICES_SOURCES = ['traces', 'span-metrics'] as const;

export type ServicesSource = (typeof SERVICES_SOURCES)[number];

/** `USE_SPAN_METRICS` swaps the services card for the span-metrics one. */
export const homeFeatureFlags = (source: ServicesSource): FeatureFlagProps[] =>
	defaultFeatureFlags.map((flag) =>
		flag.name === FeatureKeys.USE_SPAN_METRICS
			? { ...flag, active: source === 'span-metrics' }
			: flag,
	);

/** The span-metrics card takes its row set from the top level operations. */
export const topLevelOperationsResponse = (count: number): ServiceDataProps =>
	Object.fromEntries(
		buildServices(count).map((service) => [
			service.serviceName,
			['HTTP GET /', 'HTTP POST /checkout'],
		]),
	);

/**
 * Span-metrics latency, error rate and ops per second come off a table panel.
 * The page reads them from `newResult`, which the table branch of
 * `GetMetricQueryRange` never adds, so the columns render as zero however
 * complete this body is. That is the app's gap, not the mock's.
 */
export const spanMetricsResponse = (): {
	status: string;
	data: MetricRangePayloadV3['data'];
} => ({
	status: 'success',
	data: {
		resultType: 'table',
		result: [
			{
				queryName: '',
				legend: '',
				series: null,
				list: null,
				table: {
					columns: [
						{ name: 'A', queryName: 'A', isValueColumn: true },
						{ name: 'D', queryName: 'D', isValueColumn: true },
						{ name: 'F1', queryName: 'F1', isValueColumn: true },
					],
					rows: [{ data: { A: 148_000_000, D: 12.4, F1: 1.8 } }],
				},
			},
		],
	},
});
