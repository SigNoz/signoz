/** Derives an alert-condition seed from a panel's Reduce To + Thresholds (issue #5291). */

import type {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesPanelDTO,
	DashboardtypesPanelPluginDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
	Threshold,
} from 'container/CreateAlertV2/context/types';
import type { MetricAggregation } from 'types/api/v5/queryRange';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { ReduceOperators } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

export interface PanelAlertPrefill {
	matchType?: AlertThresholdMatchType;
	operator?: AlertThresholdOperator;
	threshold?: Threshold;
}

// Most-dangerous first, matching the panel editor palette; unknown colors sort last.
const THRESHOLD_COLOR_DANGER_ORDER = [
	'#f1575f',
	'#f5b225',
	'#2bb673',
	'#4e74f8',
];

interface NormalizedPanelThreshold {
	color: string;
	value: number;
	unit?: string;
	operator?: DashboardtypesComparisonOperatorDTO;
}

export function reduceToMatchType(
	reduceTo: ReduceOperators | undefined,
): AlertThresholdMatchType | undefined {
	switch (reduceTo) {
		case ReduceOperators.SUM:
			return AlertThresholdMatchType.IN_TOTAL;
		case ReduceOperators.AVG:
			return AlertThresholdMatchType.ON_AVERAGE;
		default:
			return undefined;
	}
}

function readReduceTo(
	queryData: Query['builder']['queryData'][number],
): ReduceOperators | undefined {
	const aggregationReduceTo = (
		queryData.aggregations?.[0] as MetricAggregation | undefined
	)?.reduceTo;
	// `||` not `??`: the aggregation often holds an empty-string placeholder.
	return aggregationReduceTo || queryData.reduceTo || undefined;
}

export function uniformReduceTo(query: Query): ReduceOperators | undefined {
	const { queryData } = query.builder;
	const first = queryData[0] && readReduceTo(queryData[0]);
	if (!first) {
		return undefined;
	}
	return queryData.every((data) => readReduceTo(data) === first)
		? first
		: undefined;
}

function readPanelThresholds(
	plugin: DashboardtypesPanelPluginDTO,
): NormalizedPanelThreshold[] {
	switch (plugin.kind) {
		case 'signoz/TimeSeriesPanel':
		case 'signoz/BarChartPanel':
			return (plugin.spec.thresholds ?? []).map((t) => ({
				color: t.color,
				value: t.value,
				unit: t.unit,
			}));
		case 'signoz/NumberPanel':
			return (plugin.spec.thresholds ?? []).map((t) => ({
				color: t.color,
				value: t.value,
				unit: t.unit,
				operator: t.operator,
			}));
		default:
			return [];
	}
}

function colorRank(color: string): number {
	const index = THRESHOLD_COLOR_DANGER_ORDER.indexOf(color.toLowerCase());
	return index === -1 ? THRESHOLD_COLOR_DANGER_ORDER.length : index;
}

function pickHighestDanger(
	thresholds: NormalizedPanelThreshold[],
): NormalizedPanelThreshold | undefined {
	return [...thresholds].sort(
		(a, b) => colorRank(a.color) - colorRank(b.color),
	)[0];
}

function panelOperatorToAlertOperator(
	operator: DashboardtypesComparisonOperatorDTO | undefined,
): AlertThresholdOperator | undefined {
	switch (operator) {
		case 'above':
		case 'above_or_equal':
			return AlertThresholdOperator.IS_ABOVE;
		case 'below':
		case 'below_or_equal':
			return AlertThresholdOperator.IS_BELOW;
		case 'equal':
			return AlertThresholdOperator.IS_EQUAL_TO;
		case 'not_equal':
			return AlertThresholdOperator.IS_NOT_EQUAL_TO;
		default:
			return undefined;
	}
}

export function deriveAlertPrefill(
	panel: DashboardtypesPanelDTO,
	query: Query,
	panelUnit?: string,
): PanelAlertPrefill {
	const prefill: PanelAlertPrefill = {};

	// Reduce To is user-facing only on the Value panel; elsewhere it's a default.
	if (panel.spec.plugin.kind === 'signoz/NumberPanel') {
		const matchType = reduceToMatchType(uniformReduceTo(query));
		if (matchType) {
			prefill.matchType = matchType;
		}
	}

	const top = pickHighestDanger(readPanelThresholds(panel.spec.plugin));
	if (top) {
		prefill.operator = panelOperatorToAlertOperator(top.operator);
		prefill.threshold = {
			id: uuid(),
			label: 'critical',
			thresholdValue: top.value,
			recoveryThresholdValue: null,
			unit: top.unit ?? panelUnit ?? '',
			channels: [],
			color: top.color,
		};
	}

	return prefill;
}
