import store from 'store';

import { groupBy } from './config';
import {
	filterGroupBy,
	initOptions,
	onClickSelectedFunctionHandler,
	onClickSelectedGroupByHandler,
	selectedGroupByValue,
} from './utils';

const options = [
	{
		value: '1',
		label: '1',
	},
	{
		value: '2',
		label: '2',
	},
];

jest.mock('store', () => ({
	dispatch: jest.fn(),
}));

const event = 'option';

describe('TraceGraphFilter/utils', () => {
	describe('selectedGroupBy function', () => {
		it('should return the correct value', () => {
			const selectedGroupBy = '1';
			const result = selectedGroupByValue(selectedGroupBy, options);
			expect(result).toEqual(selectedGroupBy);
		});

		it('should return the correct value when selectedOption not found', () => {
			const selectedGroupBy = '3';

			const result = selectedGroupByValue(selectedGroupBy, options);
			expect(result).toEqual(selectedGroupBy);
		});
	});

	describe('filterGroupBy function', () => {
		it('should return true when option label contains inputValue (case-insensitive)', () => {
			const inputValue = '1';
			const option = { label: '12' };

			const result = filterGroupBy(inputValue, option);

			expect(result).toBeTruthy();
		});

		it('should return false when option label does not contain inputValue', () => {
			const inputValue = '1';
			const option = { label: '23' };

			const result = filterGroupBy(inputValue, option);

			expect(result).toBeFalsy();
		});

		it('should be case-insensitive', () => {
			const inputValue = 'test';
			const option = { label: 'TEST' };

			const result = filterGroupBy(inputValue, option);

			expect(result).toBeTruthy();
		});
	});

	describe('initOptions function', () => {
		it('should return groupBy when payload is null', () => {
			const result = initOptions(null);
			expect(result).toEqual(groupBy);
		});

		it('should return groupBy when payload is undefined', () => {
			const result = initOptions(undefined);
			expect(result).toEqual(groupBy);
		});
	});

	describe('onClickSelectedGroupByHandler function', () => {
		const options = [{ label: 'Option', value: 'option' }];
		it('should dispatch UPDATE_SELECTED_GROUP_BY action', () => {
			const mockDispatch = jest.spyOn(store, 'dispatch');

			const handler = onClickSelectedGroupByHandler(options);
			handler(event);

			expect(mockDispatch).toHaveBeenCalledWith({
				type: 'UPDATE_SELECTED_GROUP_BY',
				payload: {
					selectedGroupBy: 'option',
				},
			});
		});

		it('should not dispatch when event is not a string', () => {
			const mockDispatch = jest.spyOn(store, 'dispatch');

			const handler = onClickSelectedGroupByHandler(options);
			handler(123);
			expect(mockDispatch).not.toHaveBeenCalled();
		});
	});

	describe('onClickSelectedFunctionHandler function', () => {
		it('should not dispatch when value is not a string', () => {
			const mockDispatch = jest.spyOn(store, 'dispatch');

			const value = 123;
			onClickSelectedFunctionHandler(value);

			expect(mockDispatch).not.toHaveBeenCalled();
		});

		it('should not dispatch when value is a string but not found in functions', () => {
			const mockDispatch = jest.spyOn(store, 'dispatch');

			const value = 'nonExistentFunc';
			onClickSelectedFunctionHandler(value);

			expect(mockDispatch).not.toHaveBeenCalled();
		});
	});
});
