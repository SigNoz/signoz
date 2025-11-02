import { DefaultOptionType } from 'antd/es/select';
import { omitIdFromQuery } from 'components/ExplorerCard/utils';
import { PrecisionOptionsEnum } from 'components/Graph/yAxisConfig';
import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import {
	listViewInitialLogQuery,
	PANEL_TYPES_INITIAL_QUERY,
} from 'container/NewDashboard/ComponentsSlider/constants';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
} from 'container/OptionsMenu/constants';
import { categoryToSupport } from 'container/QueryBuilder/filters/BuilderUnitsFilter/config';
import { cloneDeep, defaultTo, isEmpty, isEqual, set, unset } from 'lodash-es';
import { Layout } from 'react-grid-layout';
import { Widgets } from 'types/api/dashboard/getAll';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import {
	dataTypeCategories,
	getCategoryName,
} from './RightContainer/dataFormatCategories';
import { CategoryNames } from './RightContainer/types';

export const getIsQueryModified = (
	currentQuery: Query,
	stagedQuery: Query | null,
): boolean => {
	if (!stagedQuery) {
		return false;
	}
	const omitIdFromStageQuery = omitIdFromQuery(stagedQuery);
	const omitIdFromCurrentQuery = omitIdFromQuery(currentQuery);
	return !isEqual(omitIdFromStageQuery, omitIdFromCurrentQuery);
};

export type PartialPanelTypes = {
	[PANEL_TYPES.BAR]: 'bar';
	[PANEL_TYPES.LIST]: 'list';
	[PANEL_TYPES.TABLE]: 'table';
	[PANEL_TYPES.TIME_SERIES]: 'graph';
	[PANEL_TYPES.VALUE]: 'value';
	[PANEL_TYPES.PIE]: 'pie';
	[PANEL_TYPES.HISTOGRAM]: 'histogram';
};

export const panelTypeDataSourceFormValuesMap: Record<
	keyof PartialPanelTypes,
	Record<DataSource, any>
> = {
	[PANEL_TYPES.BAR]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'legend',
					'expression',
					'aggregations',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'timeAggregation',
					'filters',
					'filter',
					'spaceAggregation',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'stepInterval',
					'legend',
					'queryName',
					'disabled',
					'functions',
					'expression',
					'aggregations',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'legend',
					'expression',
					'aggregations',
				],
			},
		},
	},
	[PANEL_TYPES.TIME_SERIES]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'legend',
					'expression',
					'aggregations',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'timeAggregation',
					'filters',
					'filter',
					'spaceAggregation',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'stepInterval',
					'legend',
					'queryName',
					'disabled',
					'functions',
					'expression',
					'aggregations',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'legend',
					'expression',
					'aggregations',
				],
			},
		},
	},
	[PANEL_TYPES.HISTOGRAM]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'legend',
					'expression',
					'aggregations',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'timeAggregation',
					'filters',
					'filter',
					'spaceAggregation',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'stepInterval',
					'legend',
					'queryName',
					'disabled',
					'functions',
					'expression',
					'aggregations',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'legend',
					'expression',
					'aggregations',
				],
			},
		},
	},
	[PANEL_TYPES.TABLE]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'expression',
					'legend',
					'aggregations',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'timeAggregation',
					'filters',
					'filter',
					'spaceAggregation',
					'groupBy',
					'reduceTo',
					'limit',
					'having',
					'orderBy',
					'stepInterval',
					'legend',
					'queryName',
					'expression',
					'disabled',
					'functions',
					'aggregations',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'expression',
					'legend',
					'aggregations',
				],
			},
		},
	},
	[PANEL_TYPES.PIE]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'expression',
					'legend',
					'aggregations',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'timeAggregation',
					'filters',
					'filter',
					'spaceAggregation',
					'groupBy',
					'reduceTo',
					'limit',
					'having',
					'orderBy',
					'stepInterval',
					'legend',
					'queryName',
					'expression',
					'disabled',
					'functions',
					'aggregations',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'stepInterval',
					'disabled',
					'queryName',
					'expression',
					'legend',
					'aggregations',
				],
			},
		},
	},
	[PANEL_TYPES.LIST]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'queryName',
					'filters',
					'filter',
					'limit',
					'orderBy',
					'functions',
					'aggregations',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: ['queryName', 'filters', 'filter', 'aggregations'],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'queryName',
					'filters',
					'filter',
					'limit',
					'orderBy',
					'functions',
					'aggregations',
				],
			},
		},
	},
	[PANEL_TYPES.VALUE]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'reduceTo',
					'having',
					'functions',
					'stepInterval',
					'queryName',
					'expression',
					'disabled',
					'legend',
					'aggregations',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'timeAggregation',
					'filters',
					'filter',
					'spaceAggregation',
					'having',
					'reduceTo',
					'stepInterval',
					'legend',
					'queryName',
					'expression',
					'disabled',
					'functions',
					'aggregations',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'filter',
					'reduceTo',
					'having',
					'functions',
					'stepInterval',
					'queryName',
					'expression',
					'disabled',
					'legend',
					'aggregations',
				],
			},
		},
	},
};

export function handleQueryChange(
	newPanelType: keyof PartialPanelTypes,
	supersetQuery: Query,
	currentPanelType: PANEL_TYPES,
): Query {
	return {
		...supersetQuery,
		builder: {
			...supersetQuery.builder,
			queryData: supersetQuery.builder.queryData.map((query, index) => {
				const { dataSource } = query;
				const tempQuery = cloneDeep(initialQueryBuilderFormValuesMap[dataSource]);

				const fieldsToSelect =
					panelTypeDataSourceFormValuesMap[newPanelType][dataSource].builder
						.queryData;

				fieldsToSelect.forEach((field: keyof IBuilderQuery) => {
					set(tempQuery, field, supersetQuery.builder.queryData[index][field]);
				});

				if (newPanelType === PANEL_TYPES.LIST) {
					set(tempQuery, 'aggregateOperator', 'noop');
					set(tempQuery, 'offset', 0);
					set(tempQuery, 'pageSize', 10);
					set(tempQuery, 'orderBy', undefined);
				} else if (tempQuery.aggregateOperator === 'noop') {
					// this condition takes care of the part where we start with the list panel type and then shift to other panels
					// because in other cases we never set list operator and other fields in superset query rather just update in the current / staged query
					set(tempQuery, 'aggregateOperator', 'count');
					unset(tempQuery, 'offset');
					unset(tempQuery, 'pageSize');
				}

				if (
					currentPanelType === PANEL_TYPES.LIST &&
					newPanelType !== PANEL_TYPES.LIST
				) {
					set(tempQuery, 'orderBy', undefined);
				}

				return tempQuery;
			}),
			queryTraceOperator:
				newPanelType === PANEL_TYPES.LIST
					? []
					: supersetQuery.builder.queryTraceOperator,
		},
	};
}

export const getDefaultWidgetData = (
	id: string,
	name: PANEL_TYPES,
): Widgets => ({
	id,
	title: '',
	description: '',
	nullZeroValues: '',
	opacity: '',
	panelTypes: name,
	query:
		name === PANEL_TYPES.LIST
			? listViewInitialLogQuery
			: PANEL_TYPES_INITIAL_QUERY[name],
	timePreferance: 'GLOBAL_TIME',
	softMax: null,
	softMin: null,
	stackedBarChart: name === PANEL_TYPES.BAR,
	decimalPrecision: PrecisionOptionsEnum.TWO, // default decimal precision
	selectedLogFields: defaultLogsSelectedColumns.map((field) => ({
		...field,
		type: field.fieldContext ?? '',
		dataType: field.fieldDataType ?? '',
	})),
	selectedTracesFields: defaultTraceSelectedColumns,
});

export const PANEL_TYPE_TO_QUERY_TYPES: Record<PANEL_TYPES, EQueryType[]> = {
	[PANEL_TYPES.TIME_SERIES]: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
	[PANEL_TYPES.TABLE]: [EQueryType.QUERY_BUILDER, EQueryType.CLICKHOUSE],
	[PANEL_TYPES.VALUE]: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
	[PANEL_TYPES.LIST]: [EQueryType.QUERY_BUILDER],
	[PANEL_TYPES.TRACE]: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
	[PANEL_TYPES.BAR]: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
	[PANEL_TYPES.PIE]: [EQueryType.QUERY_BUILDER, EQueryType.CLICKHOUSE],
	[PANEL_TYPES.HISTOGRAM]: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
	[PANEL_TYPES.EMPTY_WIDGET]: [
		EQueryType.QUERY_BUILDER,
		EQueryType.CLICKHOUSE,
		EQueryType.PROM,
	],
};

/**
 * Retrieves a list of category select options based on the provided category name.
 * If the category is found, it maps the formats to an array of objects containing
 * the label and value for each format.
 */
export const getCategorySelectOptionByName = (
	name?: CategoryNames | string,
): DefaultOptionType[] =>
	dataTypeCategories
		.find((category) => category.name === name)
		?.formats.map((format) => ({
			label: format.name,
			value: format.id,
		})) || [];

/**
 * Generates unit options based on the provided column unit.
 * It first retrieves the category name associated with the column unit.
 * If the category is empty, it maps all supported categories to their respective
 * select options. If a valid category is found, it filters the supported categories
 * to return only the options for the matched category.
 */
export const unitOptions = (columnUnit: string): DefaultOptionType[] => {
	const category = getCategoryName(columnUnit);
	if (isEmpty(category)) {
		return categoryToSupport.map((category) => ({
			label: category,
			options: getCategorySelectOptionByName(category),
		}));
	}
	return categoryToSupport
		.filter((supportedCategory) => supportedCategory === category)
		.map((filteredCategory) => ({
			label: filteredCategory,
			options: getCategorySelectOptionByName(filteredCategory),
		}));
};

export const placeWidgetAtBottom = (
	widgetId: string,
	layout: Layout[],
	widgetWidth?: number,
	widgetHeight?: number,
): Layout => {
	if (layout.length === 0) {
		return { i: widgetId, x: 0, y: 0, w: widgetWidth || 6, h: widgetHeight || 6 };
	}

	// Find the maximum Y coordinate and height
	const { maxY } = layout.reduce(
		(acc, curr) => ({
			maxY: Math.max(acc.maxY, curr.y + curr.h),
		}),
		{ maxY: 0 },
	);

	// Check for available space in the last row
	const lastRowWidgets = layout.filter((item) => item.y + item.h === maxY);
	const occupiedXInLastRow = lastRowWidgets.reduce(
		(acc, widget) => acc + widget.w,
		0,
	);

	// If there's space in the last row (total width < 12)
	if (occupiedXInLastRow < 12) {
		// Find the rightmost X coordinate in the last row
		const maxXInLastRow = lastRowWidgets.reduce(
			(acc, widget) => Math.max(acc, widget.x + widget.w),
			0,
		);

		// If there's enough space for a 6-width widget
		if (maxXInLastRow + defaultTo(widgetWidth, 6) <= 12) {
			return {
				i: widgetId,
				x: maxXInLastRow,
				y: maxY - (widgetHeight || 6), // Align with the last row
				w: widgetWidth || 6,
				h: widgetHeight || 6,
			};
		}
	}

	// If no space in last row, place at the bottom
	return {
		i: widgetId,
		x: 0,
		y: maxY,
		w: widgetWidth || 6,
		h: widgetHeight || 6,
	};
};

export const placeWidgetBetweenRows = (
	widgetId: string,
	layout: Layout[],
	_currentRowId: string,
	nextRowId?: string | null,
	widgetWidth?: number,
	widgetHeight?: number,
): Layout[] => {
	if (layout.length === 0) {
		return [
			{
				i: widgetId,
				x: 0,
				y: 0,
				w: widgetWidth || 6,
				h: widgetHeight || 6,
			},
		];
	}

	const nextRowIndex = nextRowId
		? layout.findIndex((item) => item.i === nextRowId)
		: -1;

	// slice the layout from current row to next row
	const sectionWidgets =
		nextRowIndex === -1 ? layout : layout.slice(0, nextRowIndex);

	const newWidgetLayout = placeWidgetAtBottom(
		widgetId,
		sectionWidgets,
		widgetWidth,
		widgetHeight,
	);
	const remainingWidgets = nextRowIndex === -1 ? [] : layout.slice(nextRowIndex);

	// add new layout in between the sectionWidgets and the rest of the layout
	return [...sectionWidgets, newWidgetLayout, ...remainingWidgets];
};
