import { Form } from 'antd';
import { GroupByFilter } from 'container/QueryBuilder/filters';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useCallback } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

function HostsListControls(): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const updatedCurrentQuery = {
		...currentQuery,
		builder: {
			...currentQuery.builder,
			queryData: [
				{
					...currentQuery.builder.queryData[0],
					aggregateOperator: 'noop',
					aggregateAttribute: {
						...currentQuery.builder.queryData[0].aggregateAttribute,
					},
				},
			],
		},
	};
	const query = updatedCurrentQuery?.builder?.queryData[0] || null;
	console.log('currentQuery', updatedCurrentQuery);
	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query,
		isListViewPanel: true,
		entityVersion: '',
	});

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			handleChangeQueryData('filters', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeGroupByKeys = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			handleChangeQueryData('groupBy', value);
		},
		[handleChangeQueryData],
	);

	return (
		<Form>
			<QueryBuilderSearch
				query={query}
				onChange={handleChangeTagFilters}
				isInfraMonitoring
			/>
			<GroupByFilter
				query={query}
				onChange={handleChangeGroupByKeys}
				isInfraMonitoring
				// disabled={!currentQuery.builder.queryData[0].aggregateAttribute.key}
			/>
		</Form>
	);
}

export default HostsListControls;
