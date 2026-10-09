import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelStatusDetail } from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelStatus/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../types/rendererProps';

import {
	getRankedAggregationFunction,
	prepareTopListData,
} from './prepareData';
import type { TopListData } from './types';

/** Aggregations whose group values don't add up to a meaningful total. */
const NON_ADDITIVE_FUNCTION = /^(avg|min|max|median|p\d+|quantile)/;

const quoteAll = (names: string[]): string =>
	names.map((name) => `"${name}"`).join(', ');
const verbFor = (names: string[]): string =>
	names.length === 1 ? 'is' : 'are';

/**
 * Builder queries with a limit that an enabled formula reads. Each input is cut to its
 * own top N before the formula joins them, so the formula only sees groups that made
 * every input's cut.
 */
function getLimitedFormulaInputs(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
): string[] {
	const envelopes = requestPayload?.compositeQuery?.queries ?? [];
	const expressions = envelopes
		.filter((envelope) => envelope.type === 'builder_formula')
		.map(
			(envelope) => envelope.spec as { expression?: string; disabled?: boolean },
		)
		.filter((formula) => !formula.disabled && formula.expression)
		.map((formula) => formula.expression as string);
	if (expressions.length === 0) {
		return [];
	}
	return envelopes
		.filter((envelope) => envelope.type === 'builder_query')
		.map((envelope) => envelope.spec as { name?: string; limit?: number })
		.filter(
			(query): query is { name: string; limit: number } =>
				Boolean(query.name) && (query.limit ?? 0) > 0,
		)
		.filter((query) =>
			expressions.some((expression) =>
				new RegExp(`\\b${query.name}\\b`).test(expression),
			),
		)
		.map((query) => query.name);
}

function collectIssues(
	{
		rows,
		labelColumnNames,
		ignoredValueColumns,
		ignoredResults,
		orderedByGroupKey,
	}: TopListData,
	limitedFormulaInputs: string[],
): string[] {
	const issues: string[] = [];
	if (ignoredResults.length > 0) {
		issues.push(
			`The list ranks "${rows[0].queryName}" only; ${quoteAll(ignoredResults)} ${verbFor(ignoredResults)} not shown. Disable the queries you don't want to rank.`,
		);
	}
	if (limitedFormulaInputs.length > 0) {
		issues.push(
			`${quoteAll(limitedFormulaInputs)} ${verbFor(limitedFormulaInputs)} limited before the formula combines them, so the formula only sees groups in every input's top N. Set the limit on the formula instead.`,
		);
	}
	if (orderedByGroupKey) {
		issues.push(
			`The query orders by "${orderedByGroupKey}", so the list shows the first groups by that key rather than the top values. Order by the value instead.`,
		);
	}
	if (labelColumnNames.length === 0) {
		issues.push(
			'The query has no group by, so the list shows a single total. Add a group by to rank its groups.',
		);
	}
	if (ignoredValueColumns.length > 0) {
		issues.push(
			`The list ranks the first value column only; ${quoteAll(ignoredValueColumns)} ${verbFor(ignoredValueColumns)} not shown.`,
		);
	}
	if (rows.length > 1 && rows.every((row) => row.label === rows[0].label)) {
		issues.push(
			'Every row has the same label. Use {{group-by key}} variables in the legend to tell rows apart.',
		);
	}
	return issues;
}

/** Share of total sums the rows, which says nothing for averages, percentiles, min or max. */
function getShareIssue(
	{ rows, valueName }: TopListData,
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
): string | null {
	const aggregation = getRankedAggregationFunction(
		requestPayload,
		rows[0].queryName,
	);
	if (!aggregation || !NON_ADDITIVE_FUNCTION.test(aggregation)) {
		return null;
	}
	return `Share of total adds up "${valueName}" across rows, which isn't meaningful for averages, percentiles, minimums or maximums. Turn it off in Appearance, or rank a count or sum.`;
}

export function getTopListDataWarning(
	panel: PanelOfKind<'signoz/TopListPanel'>,
	data: PanelQueryData,
): PanelStatusDetail | null {
	const topList = prepareTopListData(data);
	if (topList.rows.length === 0) {
		return null;
	}

	const shareIssue = panel.spec.plugin.spec.appearance?.showShare
		? getShareIssue(topList, data.requestPayload)
		: null;
	const issues = [
		...collectIssues(topList, getLimitedFormulaInputs(data.requestPayload)),
		...(shareIssue ? [shareIssue] : []),
	];
	if (issues.length === 0) {
		return null;
	}
	return {
		message: 'This list may not rank what you expect.',
		messages: issues,
	};
}
