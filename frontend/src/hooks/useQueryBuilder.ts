import {
	QueryBuilderContext,
	QueryBuilderContextType,
} from 'providers/QueryBuilder';
import { useContext } from 'react';

export function useQueryBuilder(): QueryBuilderContextType {
	return useContext(QueryBuilderContext);
}
