/* eslint-disable sonarjs/cognitive-complexity */
import {
	convertFiltersToExpressionWithExistingQuery,
	removeKeysFromExpression,
} from 'components/QueryBuilderV2/utils';
import { cloneDeep, isArray, isEmpty } from 'lodash-es';
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
	filter: TagFilterItem,
): IBuilderQuery => {
	const existingFilters = queryData.filters?.items || [];

	// addition | update
	const currentFilterKey = filter.key?.key;
	const valueToAdd = filter.value.toString();
	const newItems: TagFilterItem[] = [];

	existingFilters.forEach((existingFilter) => {
		const newFilter = cloneDeep(existingFilter);
		if (
			newFilter.key?.key === currentFilterKey &&
			!(isArray(newFilter.value) && newFilter.value.includes(valueToAdd)) &&
			newFilter.value !== valueToAdd
		) {
			if (isEmpty(newFilter.value)) {
				newFilter.value = valueToAdd;
				newFilter.op = 'IN';
			} else {
				newFilter.value = (isArray(newFilter.value)
					? [...newFilter.value, valueToAdd]
					: [newFilter.value, valueToAdd]) as string[] | string;

				newFilter.op = 'IN';
			}
		}

		newItems.push(newFilter);
	});

	// if yet the filter key doesn't get added then add it
	if (!newItems.find((item) => item.key?.key === currentFilterKey)) {
		newItems.push(filter);
	}

	const newFilterToUpdate = {
		...queryData.filters,
		items: newItems,
		op: queryData.filters?.op || 'AND',
	};

	return {
		...queryData,
		...convertFiltersToExpressionWithExistingQuery(
			newFilterToUpdate,
			queryData.filter?.expression,
		),
	};
};

/**
 * Updates a single widget by adding filters to its query
 */
const updateSingleWidget = (
	widget: Widgets,
	filter: TagFilterItem,
): Widgets => {
	if (!widget.query?.builder?.queryData || isEmpty(filter)) {
		return widget;
	}

	return {
		...widget,
		query: {
			...widget.query,
			builder: {
				...widget.query.builder,
				queryData: widget.query.builder.queryData.map((queryData) =>
					updateQueryFilters(queryData, filter),
				),
			},
		},
	};
};

const removeIfPresent = (
	queryData: IBuilderQuery,
	filter: TagFilterItem,
): IBuilderQuery => {
	const existingFilters = queryData.filters?.items || [];

	// addition | update
	const currentFilterKey = filter.key?.key;
	const valueToAdd = filter.value.toString();
	const newItems: TagFilterItem[] = [];

	existingFilters.forEach((existingFilter) => {
		const newFilter = cloneDeep(existingFilter);
		if (newFilter.key?.key === currentFilterKey) {
			if (isArray(newFilter.value) && newFilter.value.includes(valueToAdd)) {
				newFilter.value = newFilter.value.filter((value) => value !== valueToAdd);
			} else if (newFilter.value === valueToAdd) {
				return;
			}
		}

		newItems.push(newFilter);
	});

	return {
		...queryData,
		filters: {
			...queryData.filters,
			items: newItems,
			op: queryData.filters?.op || 'AND',
		},
		filter: {
			...queryData.filter,
			expression: removeKeysFromExpression(
				queryData.filter?.expression ?? '',
				filter.key?.key ? [filter.key.key] : [],
				true,
			),
		},
	};
};

const updateAfterRemoval = (
	widget: Widgets,
	filter: TagFilterItem,
): Widgets => {
	if (!widget.query?.builder?.queryData || isEmpty(filter)) {
		return widget;
	}

	// remove the filters where the current filter is available as value as this widget is not selected anymore, hence removal
	return {
		...widget,
		query: {
			...widget.query,
			builder: {
				...widget.query.builder,
				queryData: widget.query.builder.queryData.map((queryData) =>
					removeIfPresent(queryData, filter),
				),
			},
		},
	};
};

/**
 * A function that takes a dashboard configuration and a list of tag filters
 * and returns an updated dashboard with the filters appended to widget queries.
 *
 * @param dashboard The dashboard configuration
 * @param filters Array of tag filters to apply to widgets
 * @param widgetIds Optional array of widget IDs to filter which widgets get updated
 * @returns Updated dashboard configuration with filters applied
 */
export const addTagFiltersToDashboard = (
	dashboard: Dashboard | undefined,
	filter: TagFilterItem,
	widgetIds?: string[],
	applyToAll?: boolean,
): Dashboard | undefined => {
	if (!dashboard || isEmpty(filter)) {
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
					if (!applyToAll && widgetIds && !widgetIds.includes(widget.id)) {
						// removal if needed
						return updateAfterRemoval(widget as Widgets, filter);
					}
					return updateSingleWidget(widget as Widgets, filter);
				}
				return widget;
			},
		);
	}

	return updatedDashboard;
};
