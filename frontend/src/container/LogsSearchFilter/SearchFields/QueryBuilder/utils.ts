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

export const hashCode = (s: string): string => {
	if (!s) {
		return '0';
	}
	return `${Math.abs(
		s.split('').reduce((a, b) => {
			// eslint-disable-next-line no-bitwise, no-param-reassign
			a = (a << 5) - a + b.charCodeAt(0);
			// eslint-disable-next-line no-bitwise
			return a & a;
		}, 0),
	)}`;
};
