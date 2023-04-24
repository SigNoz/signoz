/* eslint-disable sonarjs/no-identical-functions */
import { renderHook } from '@testing-library/react';
import { AttributeKeyOptions } from 'api/queryBuilder/getAttributesKeysValues';
import { act } from 'react-dom/test-utils';

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
				keys as AttributeKeyOptions[],
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
		const { result } = renderHook(() =>
			useOptions(
				key,
				keys as AttributeKeyOptions[],
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
			{ value: 'testKey operator result1' },
			{ value: 'testKey operator result2' },
		]);
	});

	test('returns expected options when key and operator are provided and isMulti is true', () => {
		const { result } = renderHook(() =>
			useOptions(
				key,
				keys as AttributeKeyOptions[],
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
			{ value: 'result1', selected: false },
			{ value: 'result2', selected: false },
		]);
	});

	test('returns expected options when key is not provided', () => {
		const { result } = renderHook(() =>
			useOptions(
				'',
				keys as AttributeKeyOptions[],
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
			{ value: searchValue },
			{ value: 'key1' },
			{ value: 'key2' },
		]);
	});

	test('returns expected options when isExist is true', () => {
		const { result } = renderHook(() =>
			useOptions(
				key,
				keys as AttributeKeyOptions[],
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
			({ key }) =>
				useOptions(
					key,
					keys as AttributeKeyOptions[],
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
			{ value: searchValue },
			{ value: 'key1' },
			{ value: 'key2' },
		]);

		act(() => {
			rerender({ key: 'testKey' });
		});

		expect(result.current).toEqual([
			{ value: 'testKey operator result1' },
			{ value: 'testKey operator result2' },
		]);
	});
});
