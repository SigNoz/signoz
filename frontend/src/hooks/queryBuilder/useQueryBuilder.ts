import {
	// eslint-disable-next-line no-restricted-imports
	useContext,
} from 'react';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import type { QueryBuilderContextType } from 'types/common/queryBuilder';

export function useQueryBuilder(): QueryBuilderContextType {
	return useContext(QueryBuilderContext);
}
