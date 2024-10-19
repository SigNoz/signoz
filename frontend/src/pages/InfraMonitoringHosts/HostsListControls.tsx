import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useCallback, useMemo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

function HostsListControls(): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const updatedCurrentQuery = useMemo(
		() => ({
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
		}),
		[currentQuery],
	);
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

	return (
		<div className="hosts-list-controls">
			<QueryBuilderSearch
				query={query}
				onChange={handleChangeTagFilters}
				isInfraMonitoring
			/>
		</div>
	);
}

export default HostsListControls;
