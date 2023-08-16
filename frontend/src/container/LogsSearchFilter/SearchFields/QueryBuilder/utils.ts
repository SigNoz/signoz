import _set from 'lodash-es/set';

import { Query } from './QueryBuilder';

export const parseQuery = (queries: Query): Query => {
	if (Array.isArray(queries)) {
		const isContainsPresent = queries.find((e) => e.value === 'CONTAINS');
		if (isContainsPresent) {
			// find the index of VALUE to update
			const valueIndex = queries.findIndex((e) => e.type === 'QUERY_VALUE');
			if (valueIndex > -1) {
				// update the value to wrap with ""
				_set(
					queries,
					[valueIndex, 'value'],
					`'${queries[valueIndex].value || ''}'`,
				);
			}
			return queries;
		}
	}
	return queries;
};
