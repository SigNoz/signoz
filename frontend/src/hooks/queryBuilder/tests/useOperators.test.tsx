import { renderHook } from '@testing-library/react';
import { AttributeKeyOptions } from 'api/queryBuilder/getAttributesKeysValues';

import { useOperators } from '../useOperators';

describe('useOperators', () => {
	const keys: AttributeKeyOptions[] = [
		{ key: 'myStringKey', dataType: 'string', type: 'tag', isColumn: false },
		{ key: 'myNumberKey', dataType: 'number', type: 'tag', isColumn: false },
		{ key: 'booleanKey', dataType: 'boolean', type: 'tag', isColumn: false },
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
		const keys: AttributeKeyOptions[] = [];
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
