import type {
	ListRulesV3200,
	RuletypesRuleConditionDTO,
	RuletypesRuleDTO,
	RuletypesRuleViewDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { Literal } from './literal';

type Rule = Literal<RuletypesRuleDTO>;
type RuleCondition = Literal<RuletypesRuleConditionDTO>;

const baseCondition: RuleCondition = {
	compositeQuery: {
		queryType: 'builder',
		panelType: 'graph',
		queries: null,
	},
} as unknown as RuleCondition;

// The v3 list reports these names as the rule's thresholds.
const withThresholds = (...names: string[]): RuleCondition => ({
	...baseCondition,
	thresholds: {
		kind: 'basic',
		spec: names.map((name) => ({
			name,
			matchType: 'at_least_once',
			op: 'above',
			target: 0,
		})),
	},
});

const make = (id: string, overrides: Partial<Rule>): RuletypesRuleDTO =>
	({
		id,
		alert: `Alert ${id}`,
		alertType: 'METRIC_BASED_ALERT',
		condition: baseCondition,
		createdAt: '2023-10-15T10:00:00Z',
		updatedAt: '2023-10-19T10:00:00Z',
		createdBy: 'alice@signoz.io',
		updatedBy: 'alice@signoz.io',
		disabled: false,
		state: 'inactive',
		labels: { severity: 'info' },
		annotations: {},
		ruleType: 'threshold_rule',
		schemaVersion: 'v2alpha1',
		evaluation: {
			kind: 'rolling',
			spec: { evalWindow: '5m0s', frequency: '1m0s' },
		},
		notificationSettings: { usePolicy: false, renotify: { enabled: false } },
		...overrides,
	}) satisfies Rule as RuletypesRuleDTO;

export const alertRulesFixture: RuletypesRuleDTO[] = [
	make('rule-1', {
		condition: withThresholds('critical', 'warning'),
		alert: 'High CPU Alert',
		state: 'firing',
		labels: { severity: 'critical', team: 'infra' },
	}),
	make('rule-2', {
		condition: withThresholds('warning'),
		alert: 'Memory Pending Alert',
		state: 'pending',
		labels: { severity: 'warning', team: 'backend' },
	}),
	make('rule-3', {
		condition: withThresholds('info'),
		alert: 'Healthy Alert',
		state: 'inactive',
		labels: { severity: 'info', team: 'infra' },
	}),
	make('rule-4', {
		condition: withThresholds('critical'),
		alert: 'Disabled Alert',
		state: 'disabled',
		disabled: true,
		labels: { severity: 'critical', team: 'frontend' },
	}),
	make('rule-5', {
		alert: 'No Labels Alert',
		state: 'inactive',
		labels: {},
	}),
];

export const alertRulesPaginationFixture: RuletypesRuleDTO[] = Array.from(
	{ length: 15 },
	(_, i) =>
		make(`rule-pag-${i}`, {
			alert: `Pag Rule ${i}`,
			state: i % 2 === 0 ? 'firing' : 'inactive',
			condition: withThresholds(i % 2 === 0 ? 'critical' : 'warning'),
			labels: { severity: i % 2 === 0 ? 'critical' : 'warning' },
			createdAt: `2023-10-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
		}),
);

const RULES_RESERVED_KEYWORDS = [
	'name',
	'thresholds',
	'alert_type',
	'rule_type',
	'created_by',
	'updated_by',
	'created_at',
	'updated_at',
];

const uniqueLabelPairs = (
	rules: RuletypesRuleDTO[],
): { key: string; value: string }[] => {
	const seen = new Map<string, { key: string; value: string }>();
	rules.forEach((r) =>
		Object.entries(r.labels ?? {}).forEach(([key, value]) => {
			seen.set(`${key}=${value}`, { key, value: String(value) });
		}),
	);
	return [...seen.values()];
};

// Mirrors /api/v3/rules: filters by `states` and pages by `limit`/`offset`.
// The `query` DSL is not evaluated; tests assert on the request instead.
export const listRulesV3Response = (
	rules: RuletypesRuleDTO[],
	searchParams: URLSearchParams,
): ListRulesV3200 => {
	const states = searchParams.getAll('states');
	const limit = Number(searchParams.get('limit') ?? rules.length);
	const offset = Number(searchParams.get('offset') ?? 0);
	const matching = states.length
		? rules.filter((r) => states.includes(r.state))
		: rules;
	return {
		status: 'success',
		data: {
			// distinct lowercased threshold names; the API's rank order is not mirrored
			rules: matching.slice(offset, offset + limit).map((rule) => ({
				...rule,
				thresholds: [
					...new Set(
						(rule.condition.thresholds?.spec ?? []).map((threshold) =>
							threshold.name.toLowerCase(),
						),
					),
				],
			})),
			total: matching.length,
			labels: uniqueLabelPairs(rules),
			reservedKeywords: RULES_RESERVED_KEYWORDS,
		},
	};
};

export const ruleViewsFixture = [
	{
		id: 'view-1',
		name: 'Critical firing',
		orgId: 'org-1',
		createdAt: '2023-10-15T10:00:00Z',
		updatedAt: '2023-10-19T10:00:00Z',
		data: {
			version: 'v1',
			query: "thresholds = 'critical'",
			states: ['firing'],
			sort: 'name',
			order: 'asc',
		},
	},
	{
		id: 'view-2',
		name: 'Infra team',
		orgId: 'org-1',
		createdAt: '2023-10-15T10:00:00Z',
		updatedAt: '2023-10-18T10:00:00Z',
		data: {
			version: 'v1',
			query: "team = 'infra'",
			states: [],
			sort: 'updated_at',
			order: 'desc',
		},
	},
] satisfies Literal<RuletypesRuleViewDTO>[] as RuletypesRuleViewDTO[];
