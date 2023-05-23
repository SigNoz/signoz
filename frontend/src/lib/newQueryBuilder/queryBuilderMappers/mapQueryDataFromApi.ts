import { initialQueryBuilderFormValues } from 'constants/queryBuilder';
import { BuilderQueryDataResourse } from 'types/api/queryBuilder/queryBuilderData';
import { isQuery, QueryBuilderData } from 'types/common/queryBuilder';

export const mapQueryDataFromApi = (
	data: BuilderQueryDataResourse,
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
