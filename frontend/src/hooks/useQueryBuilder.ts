import { QueryBuilderContext } from 'providers/QueryBuilder';
import { useContext } from 'react';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

export function useQueryBuilder(): QueryBuilderContextType {
	return useContext(QueryBuilderContext);
}
