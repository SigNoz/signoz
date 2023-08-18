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
): QueryBuilderData => {
	const queryData: QueryBuilderData['queryData'] = [];
	const queryFormulas: QueryBuilderData['queryFormulas'] = [];

	Object.entries(data).forEach(([, value]) => {
		if (FORMULA_REGEXP.test(value.queryName)) {
			const formula = value as IBuilderFormula;
			queryFormulas.push({ ...initialFormulaBuilderFormValues, ...formula });
		} else {
			const query = value as IBuilderQuery;
			queryData.push({ ...initialQueryBuilderFormValuesMap.metrics, ...query });
		}
	});

	return { queryData, queryFormulas };
};
