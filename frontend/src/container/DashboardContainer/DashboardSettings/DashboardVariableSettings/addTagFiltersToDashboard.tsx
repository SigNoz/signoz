import {
	convertFiltersToExpressionWithExistingQuery,
	removeKeysFromExpression,
} from 'components/QueryBuilderV2/utils';
import { cloneDeep, isArray, isEmpty } from 'lodash-es';
import { extractQueryPairs } from 'utils/queryContextUtils';
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
				newFilter.value = (
					isArray(newFilter.value)
						? [...newFilter.value, valueToAdd]
						: [newFilter.value, valueToAdd]
				) as string[] | string;

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

const escapeRegExp = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createVariablePlaceholderRegExp = (variableName: string): RegExp => {
	const escapedName = escapeRegExp(variableName);
	// (?![\w.]) prevents $env from matching inside $environment or $env.attr
	return new RegExp(
		`(\\$${escapedName}(?![\\w.])|\\{\\{\\s*\\.?${escapedName}\\s*\\}\\}|\\[\\[\\s*${escapedName}\\s*\\]\\])`,
		'g',
	);
};

// Create a fresh regex per call to avoid g-flag lastIndex state issues
const matchesVariablePlaceholder = (
	text: string,
	variableName: string,
): boolean => createVariablePlaceholderRegExp(variableName).test(text);

const removeVariablePlaceholderFromFilterItems = (
	items: TagFilterItem[],
	variableName: string,
): TagFilterItem[] =>
	items
		.map((item) => {
			if (isArray(item.value)) {
				const cleaned = (item.value as (string | number | boolean)[]).filter(
					(v) => !matchesVariablePlaceholder(String(v), variableName),
				);
				return { ...item, value: cleaned };
			}
			return item;
		})
		.filter((item) => {
			if (isArray(item.value)) {
				return (item.value as unknown[]).length > 0;
			}
			return !matchesVariablePlaceholder(String(item.value), variableName);
		});

/**
 * Removes entire key-value clauses from a filter expression where the value
 * is a reference to the given variable. Uses the ANTLR-aware removeKeysFromExpression
 * so that surrounding AND/OR operators are also cleaned up correctly (no dangling operators).
 */
const removeVariableFromExpression = (
	expression: string | undefined,
	variableName: string,
): string => {
	if (!expression) {
		return '';
	}

	const queryPairs = extractQueryPairs(expression);

	const keysToRemove = queryPairs
		.filter((pair) => {
			const singleValue = pair.value?.toString() ?? '';
			const listValues = (pair.valueList ?? []).join(' ');
			return (
				matchesVariablePlaceholder(singleValue, variableName) ||
				matchesVariablePlaceholder(listValues, variableName)
			);
		})
		.map((pair) => pair.key);

	if (keysToRemove.length === 0) {
		return expression;
	}

	return removeKeysFromExpression(expression, keysToRemove, `$${variableName}`);
};

const removeVariablePlaceholders = (
	text: string | undefined,
	variableName: string,
): string => {
	if (!text) {
		return '';
	}

	return text
		.replace(createVariablePlaceholderRegExp(variableName), '')
		.replace(/\s{2,}/g, ' ')
		.trim();
};

const removeVariableReferencesFromQueryData = (
	queryData: IBuilderQuery,
	variableName: string,
	dynamicVariablesAttribute?: string,
): IBuilderQuery => {
	let updatedQueryData = { ...queryData };

	if (dynamicVariablesAttribute) {
		const filters = updatedQueryData.filters?.items || [];
		const filteredItems = filters.filter((item) => {
			if (item.key?.key !== dynamicVariablesAttribute) {
				return true;
			}
			if (isArray(item.value)) {
				return !(item.value as (string | number | boolean)[]).some((v) =>
					matchesVariablePlaceholder(String(v), variableName),
				);
			}
			return !matchesVariablePlaceholder(String(item.value), variableName);
		});

		updatedQueryData = {
			...updatedQueryData,
			filters: {
				...updatedQueryData.filters,
				items: filteredItems,
				op: updatedQueryData.filters?.op || 'AND',
			},
			filter: {
				...updatedQueryData.filter,
				expression: removeKeysFromExpression(
					updatedQueryData.filter?.expression ?? '',
					[dynamicVariablesAttribute],
					`$${variableName}`,
				),
			},
			expression: removeKeysFromExpression(
				updatedQueryData.expression ?? '',
				[dynamicVariablesAttribute],
				`$${variableName}`,
			),
		};
	}

	updatedQueryData = {
		...updatedQueryData,
		filters: {
			...updatedQueryData.filters,
			items: removeVariablePlaceholderFromFilterItems(
				updatedQueryData.filters?.items || [],
				variableName,
			),
			op: updatedQueryData.filters?.op || 'AND',
		},
		filter: {
			...updatedQueryData.filter,
			// Use ANTLR-aware removal so the whole key-value clause is removed
			// and no dangling AND/OR operators are left behind.
			expression: removeVariableFromExpression(
				updatedQueryData.filter?.expression,
				variableName,
			),
		},
		expression: removeVariableFromExpression(
			updatedQueryData.expression,
			variableName,
		),
		legend: removeVariablePlaceholders(updatedQueryData.legend, variableName),
	};

	return updatedQueryData;
};

const removeVariableReferencesFromWidget = (
	widget: Widgets,
	variableName: string,
	dynamicVariablesAttribute?: string,
): Widgets => {
	let updatedWidget = { ...widget };

	if (updatedWidget.query?.builder?.queryData) {
		updatedWidget = {
			...updatedWidget,
			query: {
				...updatedWidget.query,
				builder: {
					...updatedWidget.query.builder,
					queryData: updatedWidget.query.builder.queryData.map((queryData) =>
						removeVariableReferencesFromQueryData(
							queryData,
							variableName,
							dynamicVariablesAttribute,
						),
					),
				},
			},
		};
	}

	if (updatedWidget.query?.promql) {
		updatedWidget = {
			...updatedWidget,
			query: {
				...updatedWidget.query,
				promql: updatedWidget.query.promql.map((promqlQuery) => ({
					...promqlQuery,
					query: removeVariablePlaceholders(promqlQuery.query, variableName),
					legend: removeVariablePlaceholders(promqlQuery.legend, variableName),
				})),
			},
		};
	}

	if (updatedWidget.query?.clickhouse_sql) {
		updatedWidget = {
			...updatedWidget,
			query: {
				...updatedWidget.query,
				clickhouse_sql: updatedWidget.query.clickhouse_sql.map((sqlQuery) => ({
					...sqlQuery,
					query: removeVariablePlaceholders(sqlQuery.query, variableName),
					legend: removeVariablePlaceholders(sqlQuery.legend, variableName),
				})),
			},
		};
	}

	if (updatedWidget.query?.builder?.queryFormulas) {
		updatedWidget = {
			...updatedWidget,
			query: {
				...updatedWidget.query,
				builder: {
					...updatedWidget.query.builder,
					queryFormulas: updatedWidget.query.builder.queryFormulas.map(
						(formula) => ({
							...formula,
							expression: removeVariablePlaceholders(formula.expression, variableName),
							legend: removeVariablePlaceholders(formula.legend, variableName),
						}),
					),
				},
			},
		};
	}

	if (updatedWidget.query?.builder?.queryTraceOperator) {
		updatedWidget = {
			...updatedWidget,
			query: {
				...updatedWidget.query,
				builder: {
					...updatedWidget.query.builder,
					queryTraceOperator: updatedWidget.query.builder.queryTraceOperator.map(
						(traceQuery) =>
							removeVariableReferencesFromQueryData(
								traceQuery,
								variableName,
								dynamicVariablesAttribute,
							),
					),
				},
			},
		};
	}

	updatedWidget = {
		...updatedWidget,
		title: removeVariablePlaceholders(
			updatedWidget.title as string,
			variableName,
		),
		description: removeVariablePlaceholders(
			updatedWidget.description,
			variableName,
		),
	};

	return updatedWidget;
};

export const removeVariableReferencesFromDashboard = (
	dashboard: Dashboard | undefined,
	variableName: string,
	dynamicVariablesAttribute?: string,
): Dashboard | undefined => {
	if (!dashboard || !variableName) {
		return dashboard;
	}

	const updatedDashboard = cloneDeep(dashboard);

	if (updatedDashboard.data.widgets) {
		updatedDashboard.data.widgets = updatedDashboard.data.widgets.map(
			(widget) => {
				if ('query' in widget) {
					return removeVariableReferencesFromWidget(
						widget as Widgets,
						variableName,
						dynamicVariablesAttribute,
					);
				}
				return widget;
			},
		);
	}

	return updatedDashboard;
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
