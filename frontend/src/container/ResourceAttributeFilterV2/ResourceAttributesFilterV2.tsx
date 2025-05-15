import './ResourceAttributesFilter.styles.scss';

import { initialQueriesMap, OperatorConfigKeys } from 'constants/queryBuilder';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useCallback } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

function ResourceAttributesFilter(): JSX.Element | null {
	const { currentQuery } = useQueryBuilder();
	const query = currentQuery?.builder?.queryData[0] || null;

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query,
		entityVersion: '',
	});

	// initialise tab with default query.
	useShareBuilderUrl({
		...initialQueriesMap.traces,
		builder: {
			...initialQueriesMap.traces.builder,
			queryData: [
				{
					...initialQueriesMap.traces.builder.queryData[0],
					dataSource: DataSource.TRACES,
					aggregateOperator: 'noop',
					aggregateAttribute: {
						...initialQueriesMap.traces.builder.queryData[0].aggregateAttribute,
						type: 'resource',
					},
					queryName: '',
				},
			],
		},
	});

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			handleChangeQueryData('filters', value);
		},
		[handleChangeQueryData],
	);

	return (
		<div className="resourceAttributesFilter-container-v2">
			<QueryBuilderSearchV2
				query={query}
				onChange={handleChangeTagFilters}
				operatorConfigKey={OperatorConfigKeys.EXCEPTIONS}
				hideSpanScopeSelector={false}
			/>
		</div>
	);
}

export default ResourceAttributesFilter;
