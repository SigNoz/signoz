import { initialQueryBuilderFormValues } from 'constants/queryBuilder';
import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderData } from 'types/common/queryBuilder';
import { QueryDataResourse } from 'types/common/queryBuilderMappers.types';

export const mapQueryDataFromApi = (
	data: QueryDataResourse,
): QueryBuilderData => {
	const queryData: QueryBuilderData['queryData'] = [];
	const queryFormulas: QueryBuilderData['queryFormulas'] = [];

	Object.entries(data).forEach(([, value]) => {
		if (/F\d+/.test(value.queryName)) {
			const formula = value as IBuilderFormula;
			queryFormulas.push(formula);
		} else {
			const query = value as IBuilderQuery;
			queryData.push({ ...initialQueryBuilderFormValues, ...query });
		}
	});

	return { queryData, queryFormulas };
};
