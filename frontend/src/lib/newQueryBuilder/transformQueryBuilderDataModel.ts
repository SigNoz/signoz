import {
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import { FORMULA_REGEXP, TRACE_OPERATOR_REGEXP } from 'constants/regExp';
import {
	BuilderQueryDataResourse,
	IBuilderFormula,
	IBuilderQuery,
	IBuilderTraceOperator,
} from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderData } from 'types/common/queryBuilder';

export const transformQueryBuilderDataModel = (
	data: BuilderQueryDataResourse,
	queryTypes?: Record<
		string,
		'builder_query' | 'builder_formula' | 'builder_trace_operator'
	>,
): QueryBuilderData => {
	const queryData: QueryBuilderData['queryData'] = [];
	const queryFormulas: QueryBuilderData['queryFormulas'] = [];
	const queryTraceOperator: QueryBuilderData['queryTraceOperator'] = [];

	Object.entries(data).forEach(([key, value]) => {
		const isFormula = queryTypes
			? queryTypes[key] === 'builder_formula'
			: FORMULA_REGEXP.test(value.queryName);

		const isTraceOperator = queryTypes
			? queryTypes[key] === 'builder_trace_operator'
			: TRACE_OPERATOR_REGEXP.test(value.queryName);

		if (isFormula) {
			const formula = value as IBuilderFormula;
			queryFormulas.push({ ...initialFormulaBuilderFormValues, ...formula });
		} else if (isTraceOperator) {
			const traceOperator = value as IBuilderTraceOperator;
			queryTraceOperator.push({ ...traceOperator });
		} else {
			const queryFromData = value as IBuilderQuery;
			queryData.push({
				...initialQueryBuilderFormValuesMap.metrics,
				...queryFromData,
			});
		}
	});

	return { queryData, queryFormulas, queryTraceOperator };
};
