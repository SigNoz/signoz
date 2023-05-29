import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { useMemo } from 'react';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { IQueryAutocompleteResponse } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

const useAggregateKeys = ({
	query,
	searchValue,
	keys = [
		QueryBuilderKeys.GET_ATTRIBUTE_KEY,
		searchValue,
		query.dataSource,
		query.aggregateOperator,
		query.aggregateAttribute.key,
	],
}: IQueryBuilderSearchProps): UseQueryResult<
	SuccessResponse<IQueryAutocompleteResponse> | ErrorResponse
> => {
	const isQueryEnabled = useMemo(
		() =>
			query.dataSource === DataSource.METRICS
				? !!query.aggregateOperator &&
				  !!query.dataSource &&
				  !!query.aggregateAttribute.dataType
				: true,
		[
			query.aggregateAttribute.dataType,
			query.aggregateOperator,
			query.dataSource,
		],
	);

	return useQuery(
		keys,
		async () =>
			getAggregateKeys({
				searchText: searchValue,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				aggregateAttribute: query.aggregateAttribute.key,
				tagType: query.aggregateAttribute.type ?? null,
			}),
		{
			enabled: isQueryEnabled,
		},
	);
};

interface IQueryBuilderSearchProps {
	query: IBuilderQuery;
	searchValue: string;
	keys?: string[];
}

export default useAggregateKeys;
