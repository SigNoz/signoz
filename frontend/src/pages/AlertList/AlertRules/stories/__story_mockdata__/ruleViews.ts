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

/** `AlertState.DisplayRank()` in pkg/types/ruletypes/alert_state.go. */
const STATE_DISPLAY_RANK: Record<string, number> = {
	[RuletypesAlertStateDTO.firing]: 5,
	[RuletypesAlertStateDTO.nodata]: 4,
	[RuletypesAlertStateDTO.pending]: 3,
	[RuletypesAlertStateDTO.recovering]: 2,
	[RuletypesAlertStateDTO.inactive]: 1,
	[RuletypesAlertStateDTO.disabled]: 0,
};

/**
 * The v3 list as the API answers it: `states`, the `state` sort and paging are
 * applied on the server. The `query` DSL is not evaluated, so a query narrows
 * nothing here, and other sorts keep the builder's order.
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
	if (searchParams.get('sort') === RuletypesListSortDTO.state) {
		const direction =
			searchParams.get('order') === RuletypesListOrderDTO.asc ? 1 : -1;
		rules.sort(
			(a, b) =>
				direction *
				((STATE_DISPLAY_RANK[a.state] ?? 0) - (STATE_DISPLAY_RANK[b.state] ?? 0)),
		);
	}
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
			// distinct lowercased threshold names; the API's rank order is not mirrored
			rules: rules.slice(offset, offset + limit).map((rule) => ({
				...rule,
				thresholds: [
					...new Set(
						(rule.condition.thresholds?.spec ?? []).map((threshold) =>
							threshold.name.toLowerCase(),
						),
					),
				],
			})),
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
	'thresholds',
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
			query: "env = 'prod' AND thresholds = 'critical'",
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
			sort: RuletypesListSortDTO.thresholds,
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
			query: "team = 'payments' AND thresholds IN ('critical', 'error')",
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
