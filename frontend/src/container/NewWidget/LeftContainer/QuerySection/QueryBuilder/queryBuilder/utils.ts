import { Query } from 'types/api/dashboard/getAll';

import { WIDGET_QUERY_BUILDER_QUERY_KEY_NAME } from '../../constants';

const QUERY_AND_FORMULA_LIMIT = 10;

export const canCreateQueryAndFormula = (query: Query): boolean => {
	const queries = query[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME].queryData;
	const formulas = query[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME].queryFormulas;

	return queries.length + formulas.length < QUERY_AND_FORMULA_LIMIT;
};
