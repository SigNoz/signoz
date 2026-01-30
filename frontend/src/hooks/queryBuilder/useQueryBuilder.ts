import { useContext } from 'react';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

export function useQueryBuilder(): QueryBuilderContextType {
	return useContext(QueryBuilderContext);
}
