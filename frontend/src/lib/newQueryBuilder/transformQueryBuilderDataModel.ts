import {
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import { FORMULA_REGEXP } from 'constants/regExp';
import {
	BuilderQueryDataResourse,
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderData } from 'types/common/queryBuilder';

export const transformQueryBuilderDataModel = (
	data: BuilderQueryDataResourse,
	queryTypes?: Record<string, 'builder_query' | 'builder_formula'>,
): QueryBuilderData => {
	const queryData: QueryBuilderData['queryData'] = [];
	const queryFormulas: QueryBuilderData['queryFormulas'] = [];

	Object.entries(data).forEach(([key, value]) => {
		const isFormula = queryTypes
			? queryTypes[key] === 'builder_formula'
			: FORMULA_REGEXP.test(value.queryName);

		if (isFormula) {
			const formula = value as IBuilderFormula;
			queryFormulas.push({ ...initialFormulaBuilderFormValues, ...formula });
		} else {
			const queryFromData = value as IBuilderQuery;
			queryData.push({
				...initialQueryBuilderFormValuesMap.metrics,
				...queryFromData,
			});
		}
	});

	return { queryData, queryFormulas };
};
