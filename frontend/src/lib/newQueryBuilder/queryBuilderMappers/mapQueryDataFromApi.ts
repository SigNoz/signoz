import { isFormula, QueryBuilderData } from 'types/common/queryBuilder';
import { QueryDataResourse } from 'types/common/queryBuilderMappers.types';

export const mapQueryDataFromApi = (
	data: QueryDataResourse,
): QueryBuilderData => {
	const queryData: QueryBuilderData['queryData'] = [];
	const queryFormulas: QueryBuilderData['queryFormulas'] = [];

	Object.entries(data).forEach(([key, value]) => {
		if (isFormula(value, key)) {
			queryFormulas.push(value);
		} else {
			queryData.push(value);
		}
	});

	return { queryData, queryFormulas };
};
