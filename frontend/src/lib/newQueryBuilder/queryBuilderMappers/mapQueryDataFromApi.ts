import { initialQueryBuilderFormValues } from 'constants/queryBuilder';
import { isQuery, QueryBuilderData } from 'types/common/queryBuilder';
import { QueryDataResourse } from 'types/common/queryBuilderMappers.types';

export const mapQueryDataFromApi = (
	data: QueryDataResourse,
): QueryBuilderData => {
	const queryData: QueryBuilderData['queryData'] = [];
	const queryFormulas: QueryBuilderData['queryFormulas'] = [];

	Object.entries(data).forEach(([, value]) => {
		if (isQuery(value)) {
			queryData.push({ ...initialQueryBuilderFormValues, ...value });
		} else {
			queryFormulas.push(value);
		}
	});

	return { queryData, queryFormulas };
};
