import {
	RuletypesAlertStateDTO,
	RuletypesAlertTypeDTO,
	RuletypesCompareOperatorDTO,
	RuletypesEvaluationRollingDTOKind,
	RuletypesListOrderDTO,
	RuletypesListSortDTO,
	RuletypesMatchTypeDTO,
	RuletypesPanelTypeDTO,
	RuletypesQueryTypeDTO,
	RuletypesRuleDTOSchemaVersion,
	RuletypesRuleTypeDTO,
	RuletypesThresholdBasicDTOKind,
} from 'api/generated/services/sigNoz.schemas';
import type {
	ListRulesV3200,
	RuletypesRuleConditionDTO,
	RuletypesRuleDTO,
	RuletypesRuleViewDTO,
} from 'api/generated/services/sigNoz.schemas';

const baseCondition: RuletypesRuleConditionDTO = {
	compositeQuery: {
		queryType: RuletypesQueryTypeDTO.builder,
		panelType: RuletypesPanelTypeDTO.graph,
		queries: null,
	},
} as unknown as RuletypesRuleConditionDTO;

// The v3 list reports these names as the rule's thresholds.
const withThresholds = (...names: string[]): RuletypesRuleConditionDTO => ({
	...baseCondition,
	thresholds: {
		kind: RuletypesThresholdBasicDTOKind.basic,
		spec: names.map((name) => ({
			name,
			matchType: RuletypesMatchTypeDTO.at_least_once,
			op: RuletypesCompareOperatorDTO.above,
			target: 0,
		})),
	},
});

const make = (
	id: string,
	overrides: Partial<RuletypesRuleDTO>,
): RuletypesRuleDTO => ({
	id,
	alert: `Alert ${id}`,
	alertType: RuletypesAlertTypeDTO.METRIC_BASED_ALERT,
	condition: baseCondition,
	createdAt: '2023-10-15T10:00:00Z',
	updatedAt: '2023-10-19T10:00:00Z',
	createdBy: 'alice@signoz.io',
	updatedBy: 'alice@signoz.io',
	disabled: false,
	state: RuletypesAlertStateDTO.inactive,
	labels: { severity: 'info' },
	annotations: {},
	ruleType: RuletypesRuleTypeDTO.threshold_rule,
	schemaVersion: RuletypesRuleDTOSchemaVersion.v2alpha1,
	evaluation: {
		kind: RuletypesEvaluationRollingDTOKind.rolling,
		spec: { evalWindow: '5m0s', frequency: '1m0s' },
	},
	notificationSettings: { usePolicy: false, renotify: { enabled: false } },
	...overrides,
});

export const alertRulesFixture: RuletypesRuleDTO[] = [
	make('rule-1', {
		condition: withThresholds('critical', 'warning'),
		alert: 'High CPU Alert',
		state: RuletypesAlertStateDTO.firing,
		labels: { severity: 'critical', team: 'infra' },
	}),
	make('rule-2', {
		condition: withThresholds('warning'),
		alert: 'Memory Pending Alert',
		state: RuletypesAlertStateDTO.pending,
		labels: { severity: 'warning', team: 'backend' },
	}),
	make('rule-3', {
		condition: withThresholds('info'),
		alert: 'Healthy Alert',
		state: RuletypesAlertStateDTO.inactive,
		labels: { severity: 'info', team: 'infra' },
	}),
	make('rule-4', {
		condition: withThresholds('critical'),
		alert: 'Disabled Alert',
		state: RuletypesAlertStateDTO.disabled,
		disabled: true,
		labels: { severity: 'critical', team: 'frontend' },
	}),
	make('rule-5', {
		alert: 'No Labels Alert',
		state: RuletypesAlertStateDTO.inactive,
		labels: {},
	}),
];

export const alertRulesPaginationFixture: RuletypesRuleDTO[] = Array.from(
	{ length: 15 },
	(_, i) =>
		make(`rule-pag-${i}`, {
			alert: `Pag Rule ${i}`,
			state:
				i % 2 === 0
					? RuletypesAlertStateDTO.firing
					: RuletypesAlertStateDTO.inactive,
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

export const ruleViewsFixture: RuletypesRuleViewDTO[] = [
	{
		id: 'view-1',
		name: 'Critical firing',
		orgId: 'org-1',
		createdAt: '2023-10-15T10:00:00Z',
		updatedAt: '2023-10-19T10:00:00Z',
		data: {
			version: 'v1',
			query: "thresholds = 'critical'",
			states: [RuletypesAlertStateDTO.firing],
			sort: RuletypesListSortDTO.name,
			order: RuletypesListOrderDTO.asc,
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
			sort: RuletypesListSortDTO.updated_at,
			order: RuletypesListOrderDTO.desc,
		},
	},
];
