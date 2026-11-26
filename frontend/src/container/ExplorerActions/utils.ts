import { AVAILABLE_EXPORT_PANEL_TYPES } from 'constants/panelTypes';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	MetricsExplorerEventKeys,
	MetricsExplorerEvents,
} from 'container/MetricsExplorer/events';
import { cloneDeep } from 'lodash-es';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

// The explorer page, not its DataSource: the AI explorer queries traces but logs its own events.
export const ExplorerActionsSource = {
	LOGS_EXPLORER: DataSource.LOGS,
	TRACES_EXPLORER: DataSource.TRACES,
	METRICS_EXPLORER: DataSource.METRICS,
	AI_OBSERVABILITY: 'ai_observability',
} as const;

export type ExplorerActionsSource =
	(typeof ExplorerActionsSource)[keyof typeof ExplorerActionsSource];

export const EXPLORER_ACTION_EVENTS: Record<
	ExplorerActionsSource,
	{ createAlert: string; addToDashboard: string; exported: string }
> = {
	[ExplorerActionsSource.LOGS_EXPLORER]: {
		createAlert: 'Logs Explorer: Create alert',
		addToDashboard: 'Logs Explorer: Add to dashboard clicked',
		exported: 'Logs Explorer: Add to dashboard successful',
	},
	[ExplorerActionsSource.TRACES_EXPLORER]: {
		createAlert: 'Traces Explorer: Create alert',
		addToDashboard: 'Traces Explorer: Add to dashboard clicked',
		exported: 'Traces Explorer: Add to dashboard successful',
	},
	[ExplorerActionsSource.METRICS_EXPLORER]: {
		createAlert: MetricsExplorerEvents.AddToAlertClicked,
		addToDashboard: MetricsExplorerEvents.AddToDashboardClicked,
		exported: MetricsExplorerEvents.AddToDashboardSuccessful,
	},
	[ExplorerActionsSource.AI_OBSERVABILITY]: {
		createAlert: 'AI Observability Explorer: Create alert',
		addToDashboard: 'AI Observability Explorer: Add to dashboard clicked',
		exported: 'AI Observability Explorer: Add to dashboard successful',
	},
};

export function getExplorerActionEventPayload({
	sourcePage,
	panelType,
	isOneChartPerQuery,
}: {
	sourcePage: ExplorerActionsSource;
	panelType: PANEL_TYPES | null;
	isOneChartPerQuery: boolean;
}): Record<string, unknown> {
	if (sourcePage !== ExplorerActionsSource.METRICS_EXPLORER) {
		return { sourcepage: sourcePage, panelType };
	}
	return {
		sourcepage: sourcePage,
		panelType,
		[MetricsExplorerEventKeys.Tab]: 'explorer',
		[MetricsExplorerEventKeys.OneChartPerQueryEnabled]: isOneChartPerQuery,
	};
}

export function getExportPanelType(panelType: PANEL_TYPES | null): PANEL_TYPES {
	return panelType && AVAILABLE_EXPORT_PANEL_TYPES.includes(panelType)
		? panelType
		: PANEL_TYPES.TIME_SERIES;
}

// Alerts need an aggregation, and list style views carry an order the alert
// cannot use.
export function getCreateAlertLink({
	query,
	panelType,
}: {
	query: Query;
	panelType: PANEL_TYPES | null;
}): string {
	const isListStyle =
		panelType === PANEL_TYPES.LIST || panelType === PANEL_TYPES.TRACE;

	const alertQuery = cloneDeep(query);
	alertQuery.builder.queryData = alertQuery.builder.queryData.map((item) => ({
		...item,
		aggregateOperator:
			item.aggregateOperator === StringOperators.NOOP
				? StringOperators.COUNT
				: item.aggregateOperator,
		orderBy: isListStyle ? [] : item.orderBy,
	}));

	return `${ROUTES.ALERTS_NEW}?${QueryParams.compositeQuery}=${encodeURIComponent(
		JSON.stringify(alertQuery),
	)}`;
}
