import { cloneDeep } from 'lodash-es';
import { useMemo } from 'react';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

/**
 * Updates the query filters in a builder query by appending new tag filters
 */
const updateQueryFilters = (
	queryData: IBuilderQuery,
	filters: TagFilterItem[],
): IBuilderQuery => ({
	...queryData,
	filters: {
		...queryData.filters,
		items: [...queryData.filters.items, ...filters],
	},
});

/**
 * Updates a single widget by adding filters to its query
 */
const updateSingleWidget = (
	widget: Widgets,
	filters: TagFilterItem[],
): Widgets => {
	if (!widget.query?.builder?.queryData) {
		return widget;
	}

	return {
		...widget,
		query: {
			...widget.query,
			builder: {
				...widget.query.builder,
				queryData: widget.query.builder.queryData.map((queryData) =>
					updateQueryFilters(queryData, filters),
				),
			},
		},
	};
};

/**
 * A hook that takes a dashboard configuration and a list of tag filters
 * and returns an updated dashboard with the filters appended to widget queries.
 *
 * @param dashboard The dashboard configuration
 * @param filters Array of tag filters to apply to widgets
 * @param widgetIds Optional array of widget IDs to filter which widgets get updated
 * @returns Updated dashboard configuration with filters applied
 */
export const useAddTagFiltersToDashboard = (
	dashboard: Dashboard | undefined,
	filters: TagFilterItem[],
	widgetIds?: string[],
): Dashboard | undefined =>
	useMemo(() => {
		if (!dashboard || !filters.length) {
			return dashboard;
		}

		// Create a deep copy to avoid mutating the original dashboard
		const updatedDashboard = cloneDeep(dashboard);

		// Process each widget to add filters
		if (updatedDashboard.data.widgets) {
			updatedDashboard.data.widgets = updatedDashboard.data.widgets.map(
				(widget) => {
					// Only apply to widgets with 'query' property
					if ('query' in widget) {
						// If widgetIds is provided, only update widgets with matching IDs
						if (widgetIds && !widgetIds.includes(widget.id)) {
							return widget;
						}
						return updateSingleWidget(widget as Widgets, filters);
					}
					return widget;
				},
			);
		}

		return updatedDashboard;
	}, [dashboard, filters, widgetIds]);
