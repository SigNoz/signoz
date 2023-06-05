import { renderHook } from '@testing-library/react';

import { useTagValidation } from '../useTagValidation';

describe('useTagValidation', () => {
	const mockResult = ['result1', 'result2'];
	const testCases = [
		{
			value: 'test',
			operator: '',
			result: [],
			expected: {
				isValidTag: false,
				isExist: false,
				isValidOperator: false,
				isMulti: false,
				isFreeText: true,
			},
		},
		{
			value: 'test',
			operator: '=',
			result: ['abc'],
			expected: {
				isValidTag: true,
				isExist: false,
				isValidOperator: true,
				isMulti: false,
				isFreeText: false,
			},
		},
		{
			value: 'test',
			operator: 'EXISTS',
			result: [],
			expected: {
				isValidTag: true,
				isExist: true,
				isValidOperator: true,
				isMulti: false,
				isFreeText: false,
			},
		},
		{
			value: 'test',
			operator: 'IN',
			result: mockResult,
			expected: {
				isValidTag: true,
				isExist: false,
				isValidOperator: true,
				isMulti: true,
				isFreeText: false,
			},
		},
	];

	testCases.forEach((testCase) => {
		test(`expected values for ${JSON.stringify(testCase)}`, () => {
			const { result } = renderHook(() =>
				useTagValidation(testCase.value, testCase.result),
			);
			expect(result.current).toEqual(testCase.expected);
		});
	});
});
