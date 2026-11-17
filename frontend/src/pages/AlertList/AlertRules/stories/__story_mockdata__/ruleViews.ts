/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	type ListRuleViews200,
	type ListRulesV3200,
	type RenderErrorResponseDTO,
	RuletypesAlertStateDTO,
	RuletypesListOrderDTO,
	RuletypesListSortDTO,
	type RuletypesRuleViewDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	alertRulesResponse,
	type RuleShape,
} from '../../../stories/__story_mockdata__/alerts';

/**
 * The v3 list as the API answers it: `states` and paging are applied on the
 * server. The `query` DSL is not evaluated, so a query narrows nothing here.
 */
export const alertRulesPage = (
	count: number,
	shape: RuleShape,
	searchParams: URLSearchParams,
): ListRulesV3200 => {
	const states = searchParams.getAll('states');
	const rules = alertRulesResponse(count, shape).data.filter(
		(rule) => states.length === 0 || states.includes(rule.state),
	);
	const labels = new Map<string, { key: string; value: string }>();
	rules.forEach((rule) =>
		Object.entries(rule.labels ?? {}).forEach(([key, value]) =>
			labels.set(`${key}=${value}`, { key, value }),
		),
	);
	const limit = Number(searchParams.get('limit') ?? rules.length);
	const offset = Number(searchParams.get('offset') ?? 0);

	return {
		status: 'success',
		data: {
			rules: rules.slice(offset, offset + limit),
			total: rules.length,
			labels: [...labels.values()],
			reservedKeywords: [...RESERVED_RULE_KEYWORDS],
		},
	};
};

/** What `ReservedFilterKeys()` in pkg/types/ruletypes/list_filter.go answers. */
const RESERVED_RULE_KEYWORDS = [
	'alert_type',
	'created_at',
	'created_by',
	'labels.<key>',
	'name',
	'rule_type',
	'severity',
	'updated_at',
	'updated_by',
] as const;

/** The two 400 codes the v3 list answers for a filter it cannot run. */
export const INVALID_QUERY_CHOICES = [
	'off',
	'rule_list_filter_invalid',
	'rule_list_invalid',
] as const;
export type InvalidQueryChoice = (typeof INVALID_QUERY_CHOICES)[number];

const INVALID_QUERY_MESSAGES: Record<
	Exclude<InvalidQueryChoice, 'off'>,
	string
> = {
	rule_list_filter_invalid:
		"invalid filter query: unexpected token 'AND' at position 22",
	rule_list_invalid: 'invalid list params: unknown sort column',
};

export const invalidRuleQueryError = (
	code: Exclude<InvalidQueryChoice, 'off'>,
): RenderErrorResponseDTO =>
	({
		status: 'error',
		error: { code, message: INVALID_QUERY_MESSAGES[code] },
	}) as RenderErrorResponseDTO;

const VIEW_SEEDS: Pick<RuletypesRuleViewDTO, 'name' | 'data'>[] = [
	{
		name: 'Critical prod alerts',
		data: {
			version: 'v1',
			query: "env = 'prod' AND severity = 'critical'",
			states: [RuletypesAlertStateDTO.firing, RuletypesAlertStateDTO.pending],
			sort: RuletypesListSortDTO.updated_at,
			order: RuletypesListOrderDTO.desc,
		},
	},
	{
		name: 'Infra team',
		data: {
			version: 'v1',
			query: "team = 'infra'",
			states: [],
			sort: RuletypesListSortDTO.name,
			order: RuletypesListOrderDTO.asc,
		},
	},
	{
		name: 'Firing right now',
		data: {
			version: 'v1',
			query: '',
			states: [RuletypesAlertStateDTO.firing],
			sort: RuletypesListSortDTO.severity,
			order: RuletypesListOrderDTO.desc,
		},
	},
	{
		name: 'Recently created',
		data: {
			version: 'v1',
			query: '',
			states: [],
			sort: RuletypesListSortDTO.created_at,
			order: RuletypesListOrderDTO.desc,
		},
	},
	{
		name:
			'Payments on-call, everything that pages the payments rotation overnight',
		data: {
			version: 'v1',
			query: "team = 'payments' AND severity IN ('critical', 'error')",
			states: [],
			sort: RuletypesListSortDTO.state,
			order: RuletypesListOrderDTO.asc,
		},
	},
];

export const RULE_VIEW_MAX = VIEW_SEEDS.length;

export const ruleView = (index: number): RuletypesRuleViewDTO => ({
	id: `view-${index + 1}`,
	orgId: 'org-1',
	createdAt: '2026-09-01T10:00:00Z',
	updatedAt: '2026-09-15T08:00:00Z',
	...VIEW_SEEDS[index % RULE_VIEW_MAX],
});

export const ruleViewsResponse = (count: number): ListRuleViews200 => ({
	status: 'success',
	data: {
		views: Array.from({ length: count }, (_unused, index) => ruleView(index)),
	},
});
