import './ResourceAttributesFilter.styles.scss';

import { OperatorConfigKeys } from 'constants/queryBuilder';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useCallback, useEffect, useMemo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { WrapperStyled } from './styles';

function ResourceAttributesFilter(): JSX.Element | null {
	const { currentQuery, initQueryBuilderData } = useQueryBuilder();
	const query = currentQuery?.builder?.queryData[0] || null;

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query,
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
		initQueryBuilderData(updatedCurrentQuery, true);
	}, [initQueryBuilderData, updatedCurrentQuery]);

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			handleChangeQueryData('filters', value);
		},
		[handleChangeQueryData],
	);

	return (
		<WrapperStyled>
			<QueryBuilderSearchV2
				query={updatedCurrentQuery.builder.queryData[0]}
				onChange={handleChangeTagFilters}
				operatorConfigKey={OperatorConfigKeys.EXCEPTIONS}
			/>
		</WrapperStyled>
	);
}

export default ResourceAttributesFilter;
// TODO: limit suggestion list
