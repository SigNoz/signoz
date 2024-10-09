import { omitIdFromQuery } from 'components/ExplorerCard/utils';
import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import {
	listViewInitialLogQuery,
	listViewInitialTraceQuery,
	PANEL_TYPES_INITIAL_QUERY,
} from 'container/NewDashboard/ComponentsSlider/constants';
import { cloneDeep, isEqual, set, unset } from 'lodash-es';
import { Widgets } from 'types/api/dashboard/getAll';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

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
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
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
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
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
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
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
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
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
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
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
				],
			},
		},
	},
	[PANEL_TYPES.LIST]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: ['filters', 'limit', 'orderBy', 'functions'],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: ['filters', 'limit', 'orderBy', 'functions'],
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
					'reduceTo',
					'having',
					'functions',
					'stepInterval',
					'queryName',
					'expression',
					'disabled',
					'legend',
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
					'spaceAggregation',
					'having',
					'reduceTo',
					'stepInterval',
					'legend',
					'queryName',
					'expression',
					'disabled',
					'functions',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'aggregateAttribute',
					'aggregateOperator',
					'filters',
					'reduceTo',
					'having',
					'functions',
					'stepInterval',
					'queryName',
					'expression',
					'disabled',
					'legend',
				],
			},
		},
	},
};

export function handleQueryChange(
	newPanelType: keyof PartialPanelTypes,
	supersetQuery: Query,
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
				} else if (tempQuery.aggregateOperator === 'noop') {
					// this condition takes care of the part where we start with the list panel type and then shift to other panels
					// because in other cases we never set list operator and other fields in superset query rather just update in the current / staged query
					set(tempQuery, 'aggregateOperator', 'count');
					unset(tempQuery, 'offset');
					unset(tempQuery, 'pageSize');
				}

				return tempQuery;
			}),
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
	isStacked: false,
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
	selectedLogFields: [
		{
			dataType: 'string',
			type: '',
			name: 'body',
		},
		{
			dataType: 'string',
			type: '',
			name: 'timestamp',
		},
	],
	selectedTracesFields: [
		...listViewInitialTraceQuery.builder.queryData[0].selectColumns,
	],
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
