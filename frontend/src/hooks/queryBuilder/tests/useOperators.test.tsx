import { renderHook } from '@testing-library/react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { useOperators } from '../useOperators';

describe('useOperators', () => {
	const keys: BaseAutocompleteData[] = [
		{ key: 'myStringKey', dataType: 'string', type: 'tag', isColumn: false },
		{ key: 'myNumberKey', dataType: 'int64', type: 'tag', isColumn: false },
		{ key: 'booleanKey', dataType: 'bool', type: 'tag', isColumn: false },
	];

	test('returns the correct operator type for a string attribute key', () => {
		const key = 'myStringKey';
		const { result } = renderHook(() => useOperators(key, keys));
		expect(result.current).toEqual([
			'=',
			'!=',
			'IN',
			'NOT_IN',
			'LIKE',
			'NOT_LIKE',
			'CONTAINS',
			'NOT_CONTAINS',
			'EXISTS',
			'NOT_EXISTS',
		]);
	});

	test('returns the correct operator type for a number attribute key', () => {
		const key = 'myNumberKey';
		const { result } = renderHook(() => useOperators(key, keys));
		expect(result.current).toEqual([
			'=',
			'!=',
			'IN',
			'NOT_IN',
			'EXISTS',
			'NOT_EXISTS',
			'>=',
			'>',
			'<=',
			'<',
		]);
	});

	test('returns the universal operator type for an unknown attribute key', () => {
		const key = 'booleanKey';
		const { result } = renderHook(() => useOperators(key, keys));
		expect(result.current).toEqual(['=', '!=', 'EXISTS', 'NOT_EXISTS']);
	});

	test('returns the universal operator type for an empty array of attribute keys', () => {
		const key = 'otherKey';
		const keys: BaseAutocompleteData[] = [];
		const { result } = renderHook(() => useOperators(key, keys));
		expect(result.current).toEqual([
			'=',
			'!=',
			'IN',
			'NOT_IN',
			'EXISTS',
			'NOT_EXISTS',
			'LIKE',
			'NOT_LIKE',
			'>=',
			'>',
			'<=',
			'<',
			'CONTAINS',
			'NOT_CONTAINS',
		]);
	});
});
