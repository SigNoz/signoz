import { formatValueForExpression } from 'components/QueryBuilderV2/utils';

import { ScopeClause } from './types';

export const formatScopeClauses = (clauses: ScopeClause[]): string =>
	clauses
		.map(({ key, value }) => `${key} = ${formatValueForExpression(value)}`)
		.join(' AND ');
