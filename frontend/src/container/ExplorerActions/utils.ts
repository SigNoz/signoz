import { AVAILABLE_EXPORT_PANEL_TYPES } from 'constants/panelTypes';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { cloneDeep } from 'lodash-es';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { StringOperators } from 'types/common/queryBuilder';

export const EXPLORER_ACTION_EVENTS = {
	createAlert: 'Explorer: Create alert clicked',
	addToDashboard: 'Explorer: Add to dashboard clicked',
	exported: 'Explorer: Add to dashboard successful',
} as const;

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
