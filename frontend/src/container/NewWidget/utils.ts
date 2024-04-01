import { omitIdFromQuery } from 'components/ExplorerCard/utils';
import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { PANEL_TYPES_INITIAL_QUERY } from 'container/NewDashboard/ComponentsSlider/constants';
import { isEqual, set } from 'lodash-es';
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

type PartialPanelTypes = {
	[PANEL_TYPES.BAR]: 'bar';
	[PANEL_TYPES.LIST]: 'list';
	[PANEL_TYPES.TABLE]: 'table';
	[PANEL_TYPES.TIME_SERIES]: 'graph';
	[PANEL_TYPES.VALUE]: 'value';
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
			// handle the case as list view doesn't have metrics support
		},
		[DataSource.TRACES]: {
			builder: {
				// check select columns here
				queryData: ['filters', 'limit', 'orderBy'],
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
	[PANEL_TYPES.VALUE]: {
		[DataSource.LOGS]: {
			builder: {
				queryData: [
					'filters',
					'aggregateOperator',
					'aggregateAttribute',
					'reduceTo',
					'having',
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
	if (newPanelType === PANEL_TYPES.LIST) {
		return PANEL_TYPES_INITIAL_QUERY[PANEL_TYPES.LIST];
	}

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

				return tempQuery;
			}),
		},
	};
}
