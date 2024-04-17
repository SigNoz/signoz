import { omitIdFromQuery } from 'components/ExplorerCard/utils';
import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { isEqual, set, unset } from 'lodash-es';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
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
};

export const panelTypeDataSourceFormValuesMap: Record<
	keyof PartialPanelTypes,
	Record<DataSource, any>
> = {
	[PANEL_TYPES.BAR]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'spaceAggregation',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
				],
			},
		},
	},
	[PANEL_TYPES.TIME_SERIES]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'spaceAggregation',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
				],
			},
		},
	},
	[PANEL_TYPES.TABLE]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'spaceAggregation',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
				],
			},
		},
	},
	[PANEL_TYPES.PIE]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
					'functions',
					'spaceAggregation',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
				],
			},
		},
	},
	[PANEL_TYPES.LIST]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: ['filters', 'limit', 'orderBy'],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: ['filters', 'limit', 'orderBy'],
			},
		},
	},
	[PANEL_TYPES.VALUE]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'reduceTo',
					'having',
					'functions',
				],
			},
		},
		[DataSource.METRICS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'having',
					'reduceTo',
					'functions',
					'spaceAggregation',
				],
			},
		},
		[DataSource.TRACES]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'groupBy',
					'limit',
					'having',
					'orderBy',
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
				const tempQuery = { ...initialQueryBuilderFormValuesMap[dataSource] };

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
					set(tempQuery, 'aggregateOperator', 'count');
					unset(tempQuery, 'offset');
					unset(tempQuery, 'pageSize');
				}

				return tempQuery;
			}),
		},
	};
}
