import {
	initialQueryBuilderFormValues,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { getPaginationQueryDataV2 } from 'lib/newQueryBuilder/getPaginationQueryData';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { Filter } from 'types/api/v5/queryRange';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

export const getListQuery = (
	stagedQuery: Query | null,
): IBuilderQuery | null => {
	if (!stagedQuery || stagedQuery.builder.queryData.length < 1) return null;

	return stagedQuery.builder.queryData[0] ?? null;
};

export const getFrequencyChartData = (
	stagedQuery: Query | null,
	activeLogId: string | null,
): Query | null => {
	if (!stagedQuery) {
		return null;
	}
	const baseFirstQuery = getListQuery(stagedQuery);

	if (!baseFirstQuery) {
		return null;
	}

	let updatedFilterExpression = baseFirstQuery.filter?.expression || '';
	if (activeLogId) {
		updatedFilterExpression = `${updatedFilterExpression} id <= '${activeLogId}'`.trim();
	}

	const modifiedQueryData: IBuilderQuery = {
		...baseFirstQuery,
		disabled: false,
		aggregateOperator: LogsAggregatorOperator.COUNT,
		filter: {
			...baseFirstQuery.filter,
			expression: updatedFilterExpression || '',
		},
		...(activeLogId && {
			filters: {
				...baseFirstQuery.filters,
				items: [
					...(baseFirstQuery?.filters?.items || []),
					{
						id: v4(),
						key: {
							key: 'id',
							type: '',
							dataType: DataTypes.String,
						},
						op: OPERATORS['<='],
						value: activeLogId,
					},
				],
				op: 'AND',
			},
		}),
		groupBy: [
			{
				key: 'severity_text',
				dataType: DataTypes.String,
				type: '',
				id: 'severity_text--string----true',
			},
		],
		legend: '{{severity_text}}',
		orderBy: [],
		having: {
			expression: '',
		},
	};

	const modifiedQuery: Query = {
		...stagedQuery,
		builder: {
			...stagedQuery.builder,
			queryData: [modifiedQueryData], // single query data required for list chart
		},
	};

	return modifiedQuery;
};

export const getQueryByPanelType = (
	query: Query | null,
	selectedPanelType: PANEL_TYPES,
	params: {
		page?: number;
		pageSize?: number;
		filters?: TagFilter;
		filter?: Filter;
		activeLogId?: string | null;
		orderBy?: string;
	},
): Query | null => {
	if (!query) return null;

	let queryData: IBuilderQuery[] = query.builder.queryData.map((item) => ({
		...item,
	}));

	if (selectedPanelType === PANEL_TYPES.LIST) {
		const { activeLogId = null, orderBy = 'timestamp:desc' } = params;

		const paginateData = getPaginationQueryDataV2({
			page: params.page ?? 1,
			pageSize: params.pageSize ?? 10,
		});

		let updatedFilters = params.filters;
		let updatedFilterExpression = params.filter?.expression || '';
		if (activeLogId) {
			updatedFilters = {
				...params.filters,
				items: [
					...(params.filters?.items || []),
					{
						id: v4(),
						key: {
							key: 'id',
							type: '',
							dataType: DataTypes.String,
						},
						op: OPERATORS['<='],
						value: activeLogId,
					},
				],
				op: 'AND',
			};
			updatedFilterExpression = `${updatedFilterExpression} id <= '${activeLogId}'`.trim();
		}

		// Create orderBy array based on orderDirection
		const [columnName, order] = orderBy.split(':');

		const newOrderBy = [
			{ columnName: columnName || 'timestamp', order: order || 'desc' },
			{ columnName: 'id', order: order || 'desc' },
		];

		queryData = [
			{
				...(getListQuery(query) || initialQueryBuilderFormValues),
				...paginateData,
				...(updatedFilters ? { filters: updatedFilters } : {}),
				filter: { expression: updatedFilterExpression || '' },
				groupBy: [],
				having: {
					expression: '',
				},
				orderBy: newOrderBy,
				disabled: false,
			},
		];
	}

	const data: Query = {
		...query,
		builder: {
			...query.builder,
			queryData,
		},
	};

	return data;
};

export const getExportQueryData = (
	query: Query | null,
	panelType: PANEL_TYPES,
): Query | null => {
	if (!query) return null;

	if (panelType === PANEL_TYPES.LIST) {
		const listQuery = getListQuery(query);
		if (!listQuery) return null;

		return {
			...query,
			builder: {
				...query.builder,
				queryData: [
					{
						...listQuery,
						orderBy: [
							{
								columnName: 'timestamp',
								order: 'desc',
							},
						],
						limit: null,
					},
				],
			},
		};
	}
	return query;
};
