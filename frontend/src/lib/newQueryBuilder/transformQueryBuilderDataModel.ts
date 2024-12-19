import {
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import { FORMULA_REGEXP } from 'constants/regExp';
import { isUndefined } from 'lodash-es';
import {
	BuilderQueryDataResourse,
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderData } from 'types/common/queryBuilder';

export const transformQueryBuilderDataModel = (
	data: BuilderQueryDataResourse,
	query?: QueryBuilderData,
): QueryBuilderData => {
	const queryData: QueryBuilderData['queryData'] = [];
	const queryFormulas: QueryBuilderData['queryFormulas'] = [];

	Object.entries(data).forEach(([, value]) => {
		if (FORMULA_REGEXP.test(value.queryName)) {
			const formula = value as IBuilderFormula;
			const baseFormula = query?.queryFormulas?.find(
				(f) => f.queryName === value.queryName,
			);
			if (!isUndefined(baseFormula)) {
				// this is part of the flow where we create alerts from dashboard.
				// we pass the formula as is from the widget query as we do not want anything to update in formula from the format api call
				queryFormulas.push({ ...baseFormula });
			} else {
				queryFormulas.push({ ...initialFormulaBuilderFormValues, ...formula });
			}
		} else {
			const queryFromData = value as IBuilderQuery;
			const baseQuery = query?.queryData?.find(
				(q) => q.queryName === queryFromData.queryName,
			);

			if (!isUndefined(baseQuery)) {
				// this is part of the flow where we create alerts from dashboard.
				// we pass the widget query as the base query and accept the filters from the format API response.
				// which fills the variable values inside the same and is used to create alerts
				// do not accept the full object as the stepInterval field is subject to changes
				queryData.push({
					...baseQuery,
					filters: queryFromData.filters,
				});
			} else {
				queryData.push({
					...initialQueryBuilderFormValuesMap.metrics,
					...queryFromData,
				});
			}
		}
	});

	return { queryData, queryFormulas };
};
