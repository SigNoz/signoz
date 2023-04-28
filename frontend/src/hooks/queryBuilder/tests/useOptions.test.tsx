import { renderHook } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { useOptions } from '../useOptions';

describe('useOptions', () => {
	const key = 'testKey';
	const keys = [
		{
			key: 'key1',
			dataType: 'string',
			type: 'tag',
			isColumn: false,
		},
		{
			key: 'key2',
			dataType: 'string',
			type: 'tag',
			isColumn: false,
		},
	];
	const operator = 'operator';
	const searchValue = 'searchValue';
	const isMulti = false;
	const isValidOperator = true;
	const isExist = false;
	const results = ['result1', 'result2'];
	const resul = ['result1'];

	test('should return an array of options', () => {
		const { result } = renderHook(() =>
			useOptions(
				key,
				keys as BaseAutocompleteData[],
				operator,
				searchValue,
				isMulti,
				isValidOperator,
				isExist,
				results,
				resul,
			),
		);

		expect(result.current).toBeInstanceOf(Array);
	});

	test('returns expected options when key and operator are not provided', () => {
		// eslint-disable-next-line sonarjs/no-identical-functions
		const { result } = renderHook(() =>
			useOptions(
				key,
				keys as BaseAutocompleteData[],
				operator,
				searchValue,
				isMulti,
				isValidOperator,
				isExist,
				results,
				resul,
			),
		);

		expect(result.current).toEqual([
			{ label: 'testKey operator result1', value: 'testKey operator result1' },
			{ label: 'testKey operator result2', value: 'testKey operator result2' },
		]);
	});

	test('returns expected options when key and operator are provided and isMulti is true', () => {
		const { result } = renderHook(() =>
			useOptions(
				key,
				keys as BaseAutocompleteData[],
				operator,
				searchValue,
				true,
				isValidOperator,
				isExist,
				results,
				resul,
			),
		);

		expect(result.current).toEqual([
			{ label: 'result1', value: 'result1', selected: false },
			{ label: 'result2', value: 'result2', selected: false },
		]);
	});

	test('returns expected options when key is not provided', () => {
		const { result } = renderHook(() =>
			useOptions(
				'',
				keys as BaseAutocompleteData[],
				operator,
				searchValue,
				isMulti,
				isValidOperator,
				isExist,
				results,
				resul,
			),
		);

		expect(result.current).toEqual([
			{ label: `${searchValue} `, value: `${searchValue} ` },
			{ label: 'key1', value: 'key1' },
			{ label: 'key2', value: 'key2' },
		]);
	});

	test('returns expected options when isExist is true', () => {
		const { result } = renderHook(() =>
			useOptions(
				key,
				keys as BaseAutocompleteData[],
				operator,
				searchValue,
				isMulti,
				isValidOperator,
				true,
				results,
				resul,
			),
		);

		expect(result.current).toEqual([]);
	});

	test('updates options when key is updated', () => {
		const { result, rerender } = renderHook(
			// eslint-disable-next-line sonarjs/no-identical-functions
			({ key }) =>
				useOptions(
					key,
					keys as BaseAutocompleteData[],
					operator,
					searchValue,
					isMulti,
					isValidOperator,
					isExist,
					results,
					resul,
				),
			{
				initialProps: { key: '' },
			},
		);

		expect(result.current).toEqual([
			{ label: `${searchValue} `, value: `${searchValue} ` },
			{ label: 'key1', value: 'key1' },
			{ label: 'key2', value: 'key2' },
		]);

		act(() => {
			rerender({ key: 'signoz' });
		});

		expect(result.current).toEqual([
			{ label: 'signoz operator result1', value: 'signoz operator result1' },
			{ label: 'signoz operator result2', value: 'signoz operator result2' },
		]);
	});
});
