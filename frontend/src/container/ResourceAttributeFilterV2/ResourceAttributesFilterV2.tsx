import './ResourceAttributesFilter.styles.scss';

import { OPERATORS } from 'constants/queryBuilder';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
// import { prepareQueryWithDefaultTimestamp } from 'pages/LogsExplorer/utils';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useCallback, useEffect, useMemo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { WrapperStyled } from './styles';
// import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';

function ResourceAttributesFilter(): JSX.Element | null {
	const {
		currentQuery,
		handleRunQuery,
		initQueryBuilderData,
	} = useQueryBuilder();
	const query = currentQuery?.builder?.queryData[0] || null;
	const filterConfigs = useMemo(
		() => ({
			// stepInterval: { isHidden: false, isDisabled: false },
			// having: { isHidden: true, isDisabled: true },
			filters: {
				customKey: 'body',
				customOp: OPERATORS.CONTAINS,
			},
		}),
		[],
	);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query,
		// filterConfigs: filterConfigs,
		entityVersion: '',
	});

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.TRACES,
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
							type: 'resource',
						},
					},
				],
			},
		}),
		[currentQuery],
	);

	useEffect(() => {
		console.log('>>> updatedCurrentQuery', initQueryBuilderData);
		initQueryBuilderData(updatedCurrentQuery, true);
	}, [initQueryBuilderData, updatedCurrentQuery]);

	console.log('>> query: ', currentQuery);
	// const defaultValue = useMemo(() => {
	// 	const updatedQuery = updateAllQueriesOperators(
	// 		initialQueriesMap.traces,
	// 		PANEL_TYPES.LIST,
	// 		DataSource.TRACES,
	// 	);
	// 	return prepareQueryWithDefaultTimestamp(updatedQuery);
	// }, [updateAllQueriesOperators]);

	// useEffect(() => {
	// 	// const updatedQuery = updateAllQueriesOperators(
	// 	// 	initialQueriesMap.traces,
	// 	// 	PANEL_TYPES.LIST,
	// 	// 	DataSource.TRACES,
	// 	// );
	// 	handleChangeAggregatorAttribute({
	// 			key: '',
	// 			type: 'resource',
	// 		})
	// 	// return prepareQueryWithDefaultTimestamp(updatedQuery);
	// }, [handleChangeAggregatorAttribute]);

	useShareBuilderUrl(updatedCurrentQuery);

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			console.log('onchange handleChangeTagFilters', value);
			handleChangeQueryData('filters', value);
		},
		[handleChangeQueryData],
	);

	console.log('>>> query', query);

	return (
		<WrapperStyled>
			<QueryBuilderSearchV2
				query={updatedCurrentQuery.builder.queryData[0]}
				onChange={handleChangeTagFilters}
				whereClauseConfig={filterConfigs?.filters}
			/>
			<RightToolbarActions onStageRunQuery={handleRunQuery} />
		</WrapperStyled>
	);
}

ResourceAttributesFilter.defaultProps = {
	suffixIcon: undefined,
};

export default ResourceAttributesFilter;
// TODO: limit suggestion list
