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

export const EXPLORER_ACTION_EVENTS: Record<
	DataSource,
	{ createAlert: string; addToDashboard: string; exported: string }
> = {
	[DataSource.LOGS]: {
		createAlert: 'Logs Explorer: Create alert',
		addToDashboard: 'Logs Explorer: Add to dashboard clicked',
		exported: 'Logs Explorer: Add to dashboard successful',
	},
	[DataSource.TRACES]: {
		createAlert: 'Traces Explorer: Create alert',
		addToDashboard: 'Traces Explorer: Add to dashboard clicked',
		exported: 'Traces Explorer: Add to dashboard successful',
	},
	[DataSource.METRICS]: {
		createAlert: MetricsExplorerEvents.AddToAlertClicked,
		addToDashboard: MetricsExplorerEvents.AddToDashboardClicked,
		exported: MetricsExplorerEvents.AddToDashboardSuccessful,
	},
};

export function getExplorerActionEventPayload({
	sourcepage,
	panelType,
	isOneChartPerQuery,
}: {
	sourcepage: DataSource;
	panelType: PANEL_TYPES | null;
	isOneChartPerQuery: boolean;
}): Record<string, unknown> {
	if (sourcepage !== DataSource.METRICS) {
		return { sourcepage, panelType };
	}
	return {
		sourcepage,
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
