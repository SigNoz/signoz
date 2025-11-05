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

const getSingleBaseQuery = (
	stagedQuery: Query | null,
): IBuilderQuery | null => {
	const baseFirstQuery: IBuilderQuery | undefined =
		stagedQuery?.builder.queryData[0];
	return baseFirstQuery ?? null;
};

export const getFrequencyChartData = (
	stagedQuery: Query | null,
	activeLogId: string | null,
): Query | null => {
	if (!stagedQuery) {
		return null;
	}
	const baseFirstQuery = getSingleBaseQuery(stagedQuery);

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

export const getListViewData = (
	query: Query | null,
	params: {
		page: number;
		pageSize: number;
		filters: TagFilter;
		filter: Filter;
	},
	activeLogId: string | null,
	orderBy: string,
	selectedPanelType: string,
	listQuery: IBuilderQuery | null,
): Query | null => {
	if (!query) return null;

	let queryData: IBuilderQuery[] = query.builder.queryData.map((item) => ({
		...item,
		...(selectedPanelType !== PANEL_TYPES.LIST ? { order: [] } : {}), // why is this needed?
	}));

	if (selectedPanelType === PANEL_TYPES.LIST) {
		const paginateData = getPaginationQueryDataV2({
			page: params.page,
			pageSize: params.pageSize,
		}); // only in list view?

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
				...(listQuery || initialQueryBuilderFormValues),
				...paginateData,
				...(updatedFilters ? { filters: updatedFilters } : {}),
				filter: { expression: updatedFilterExpression || '' },
				groupBy: [],
				having: {
					expression: '',
				},
				// order: newOrderBy,
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

// on/off frequency chart
// data correctness check:
// freq chart:
// 1. disabled
// 2. aggregate operator is count
// 3. group by is severity_text
// 4. legend is {{severity_text}}
// 5. order by is empty
// 6. having is empty
// 7. activeLogId added if present

// list query change
