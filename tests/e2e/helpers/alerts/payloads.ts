import type { ThresholdAlertSeed, ThresholdSeedSpec } from './types';

// ─── Payload builders ────────────────────────────────────────────────────

const ANNOTATIONS = {
	description:
		'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
	summary:
		'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
};

// A minimal but valid v2 (schemaVersion v2alpha1 / version v5) threshold rule
// on the always-present `signoz_calls_total` metric. Mirrors the shape the
// CreateAlertV2 UI posts to POST /api/v2/rules.
export function buildThresholdRulePayload({
	name,
	target,
	channels,
	labels,
	thresholds,
	evalWindow = '5m0s',
	frequency = '1m',
	groupBy = [],
	queryGroupBy = [],
	renotify = { enabled: false, interval: '30m', alertStates: [] },
	alertOnAbsent,
	recoveryTarget = null,
}: ThresholdAlertSeed): Record<string, unknown> {
	const thresholdSpec = (
		thresholds ?? [{ name: 'critical', target, channels, recoveryTarget }]
	).map((spec: ThresholdSeedSpec) => ({
		name: spec.name,
		target: spec.target,
		targetUnit: spec.targetUnit ?? '',
		recoveryTarget: spec.recoveryTarget ?? null,
		matchType: spec.matchType ?? 'at_least_once',
		op: spec.op ?? 'above',
		channels: spec.channels,
	}));

	return {
		alert: name,
		alertType: 'METRIC_BASED_ALERT',
		ruleType: 'threshold_rule',
		schemaVersion: 'v2alpha1',
		version: 'v5',
		disabled: false,
		source: '',
		...(labels ? { labels } : {}),
		annotations: ANNOTATIONS,
		evaluation: {
			kind: 'rolling',
			spec: { evalWindow, frequency },
		},
		notificationSettings: {
			groupBy,
			renotify,
			usePolicy: false,
		},
		condition: {
			selectedQueryName: 'A',
			...(alertOnAbsent
				? { alertOnAbsent: true, absentFor: alertOnAbsent.absentFor }
				: {}),
			compositeQuery: {
				panelType: 'graph',
				queryType: 'builder',
				queries: [
					{
						type: 'builder_query',
						spec: {
							name: 'A',
							signal: 'metrics',
							source: '',
							aggregations: [
								{
									metricName: 'signoz_calls_total',
									temporality: '',
									timeAggregation: 'rate',
									spaceAggregation: 'sum',
								},
							],
							disabled: false,
							filter: { expression: '' },
							...(queryGroupBy.length > 0
								? {
										groupBy: queryGroupBy.map((key) => ({
											name: key,
											fieldContext: 'attribute',
											fieldDataType: 'string',
										})),
									}
								: {}),
							having: { expression: '' },
							legend: '',
						},
					},
				],
			},
			thresholds: {
				kind: 'basic',
				spec: thresholdSpec,
			},
		},
	};
}

// The v5 `queries[]` envelope is identical for both schema versions
// (`AlertCompositeQuery` in pkg/types/ruletypes/alerting.go) — only the
// threshold / evaluation / channel envelopes differ. That keeps one builder
// per signal and a thin branch over the wrapper.
export function logsCompositeQuery(marker: string): Record<string, unknown> {
	return {
		panelType: 'graph',
		queryType: 'builder',
		queries: [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'logs',
					source: '',
					disabled: false,
					filter: { expression: `body CONTAINS '${marker}'` },
					groupBy: [
						{
							name: 'service.name',
							fieldContext: 'resource',
							fieldDataType: 'string',
						},
					],
					aggregations: [{ expression: 'count()' }],
					having: { expression: '' },
					legend: '',
				},
			},
		],
	};
}

// Same shape as the logs query, one signal over: the rule's signal is what
// decides which related link the history rows carry (`links()` in
// `pkg/modules/rulestatehistory/implrulestatehistory/links.go` returns *either*
// a logs link *or* a traces link, never both).
export function tracesCompositeQuery(marker: string): Record<string, unknown> {
	return {
		panelType: 'graph',
		queryType: 'builder',
		queries: [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'traces',
					source: '',
					disabled: false,
					filter: { expression: `name = '${marker}'` },
					groupBy: [
						{
							name: 'service.name',
							fieldContext: 'resource',
							fieldDataType: 'string',
						},
					],
					aggregations: [{ expression: 'count()' }],
					having: { expression: '' },
					legend: '',
				},
			},
		],
	};
}

export function metricsCompositeQuery(
	metricName: string,
	groupByKey: string,
): Record<string, unknown> {
	return {
		panelType: 'graph',
		queryType: 'builder',
		queries: [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'metrics',
					source: '',
					disabled: false,
					filter: { expression: '' },
					groupBy: [
						{ name: groupByKey, fieldContext: 'attribute', fieldDataType: 'string' },
					],
					aggregations: [
						{
							metricName,
							temporality: '',
							timeAggregation: 'avg',
							spaceAggregation: 'max',
						},
					],
					having: { expression: '' },
					legend: '',
				},
			},
		],
	};
}

// `target 0 / op above / matchType at_least_once` fires on the first evaluation
// that sees any matching record, which is what keeps the ruler wait to ~20-35s.
export function v2RulePayload({
	name,
	alertType,
	compositeQuery,
	channels,
	severity,
	extraLabels,
	evalWindow,
	frequency,
	extraCondition,
}: {
	name: string;
	alertType: string;
	compositeQuery: Record<string, unknown>;
	channels: string[];
	severity: string;
	extraLabels?: Record<string, string>;
	evalWindow: string;
	frequency: string;
	extraCondition?: Record<string, unknown>;
}): Record<string, unknown> {
	return {
		alert: name,
		alertType,
		ruleType: 'threshold_rule',
		schemaVersion: 'v2alpha1',
		version: 'v5',
		disabled: false,
		source: '',
		labels: { severity, ...extraLabels },
		annotations: ANNOTATIONS,
		evaluation: { kind: 'rolling', spec: { evalWindow, frequency } },
		notificationSettings: {
			groupBy: [],
			renotify: { enabled: false, interval: '30m', alertStates: [] },
			usePolicy: false,
		},
		condition: {
			selectedQueryName: 'A',
			compositeQuery,
			thresholds: {
				kind: 'basic',
				spec: [
					{
						name: severity,
						target: 0,
						targetUnit: '',
						recoveryTarget: null,
						matchType: 'at_least_once',
						op: 'above',
						channels,
					},
				],
			},
			...extraCondition,
		},
	};
}

// Legacy schema: `evalWindow`/`frequency` sit at the top level, channels are
// `preferredChannels`, and `condition.{op,target,matchType}` are the numeric
// enum forms the v1 validator requires. `labels.severity` becomes the history
// `threshold.name`.
export function v1RulePayload({
	name,
	alertType,
	compositeQuery,
	channels,
	severity,
	extraLabels,
	evalWindow,
	frequency,
	extraCondition,
	target = 0,
	op = '1',
	matchType = '1',
}: {
	name: string;
	alertType: string;
	compositeQuery: Record<string, unknown>;
	channels: string[];
	severity: string;
	extraLabels?: Record<string, string>;
	evalWindow: string;
	frequency: string;
	extraCondition?: Record<string, unknown>;
	target?: number;
	op?: string;
	matchType?: string;
}): Record<string, unknown> {
	return {
		alert: name,
		alertType,
		ruleType: 'threshold_rule',
		disabled: false,
		source: '',
		evalWindow,
		frequency,
		preferredChannels: channels,
		labels: { severity, ...extraLabels },
		annotations: ANNOTATIONS,
		condition: {
			selectedQueryName: 'A',
			// Defaults match the history seeds' original shape — `target 0 / op above /
			// matchType at_least_once` fires on the first evaluation that sees data — so
			// overriding them is opt-in and cannot change what those seeds do.
			op,
			target,
			matchType,
			compositeQuery,
			...extraCondition,
		},
	};
}
