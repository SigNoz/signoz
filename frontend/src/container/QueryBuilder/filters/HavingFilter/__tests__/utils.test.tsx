import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Constants
import {
	HAVING_OPERATORS,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import { HAVING_SELECT_ID } from 'constants/testIds';
import { transformFromStringToHaving } from 'lib/query/transformQueryBuilderData';
// ** Types
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

// ** Components
import { HavingFilter } from '../HavingFilter';

const valueWithAttributeAndOperator: IBuilderQuery = {
	...initialQueryBuilderFormValuesMap.logs,
	aggregateOperator: 'SUM',
	aggregateAttribute: {
		isColumn: false,
		key: 'bytes',
		type: 'tag',
		dataType: 'float64',
	},
};

describe('Having filter behaviour', () => {
	test('Having filter render is rendered', () => {
		const mockFn = jest.fn();
		const { unmount } = render(
			<HavingFilter
				query={initialQueryBuilderFormValuesMap.metrics}
				onChange={mockFn}
			/>,
		);

		const select = screen.getByTestId(HAVING_SELECT_ID);

		expect(select).toBeInTheDocument();

		unmount();
	});

	test('Having render is disabled initially', () => {
		const mockFn = jest.fn();
		const { unmount } = render(
			<HavingFilter
				query={initialQueryBuilderFormValuesMap.metrics}
				onChange={mockFn}
			/>,
		);

		const input = screen.getByRole('combobox');

		expect(input).toBeDisabled();

		unmount();
	});

	test('Is having filter is enable', () => {
		const mockFn = jest.fn();
		const { unmount } = render(
			<HavingFilter query={valueWithAttributeAndOperator} onChange={mockFn} />,
		);

		const input = screen.getByRole('combobox');

		expect(input).toBeEnabled();

		unmount();
	});

	test('Autocomplete in the having filter', async () => {
		const onChange = jest.fn();
		const user = userEvent.setup();

		const constructedAttribute = 'SUM(tag_bytes)';
		const optionTestTitle = 'havingOption';

		const { unmount } = render(
			<HavingFilter query={valueWithAttributeAndOperator} onChange={onChange} />,
		);

		// get input
		const input = screen.getByRole('combobox');

		// click on the select
		await user.click(input);

		// show predefined options for operator with attribute SUM(tag_bytes)
		const option = screen.getByTitle(optionTestTitle);

		expect(option).toBeInTheDocument();

		await user.click(option);

		// autocomplete input
		expect(input).toHaveValue(constructedAttribute);

		// clear value from input and write from keyboard
		await user.clear(input);

		await user.type(input, 'bytes');

		// show again predefined options for operator with attribute SUM(tag_bytes)
		const sameAttributeOption = screen.getByTitle(optionTestTitle);

		expect(sameAttributeOption).toBeInTheDocument();

		await user.click(sameAttributeOption);

		expect(input).toHaveValue(constructedAttribute);

		// show operators after SUM(tag_bytes)
		const operatorsOptions = screen.getAllByTitle(optionTestTitle);

		expect(operatorsOptions.length).toEqual(HAVING_OPERATORS.length);

		// show operators after SUM(tag_bytes) when type from keyboard
		await user.clear(input);

		await user.type(input, `${constructedAttribute} !=`);

		// get filtered operators
		const filteredOperators = screen.getAllByTitle(optionTestTitle);

		expect(filteredOperators.length).toEqual(1);

		// clear and show again all operators
		await user.clear(input);
		await user.type(input, constructedAttribute);

		const returnedOptions = screen.getAllByTitle(optionTestTitle);

		expect(returnedOptions.length).toEqual(HAVING_OPERATORS.length);

		// check write value after operator
		await user.clear(input);
		await user.type(input, `${constructedAttribute} != 123`);

		expect(input).toHaveValue(`${constructedAttribute} != 123`);

		const optionWithValue = screen.getByTitle(optionTestTitle);

		// onChange after complete writting in the input or autocomplete
		await user.click(optionWithValue);

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith([
			transformFromStringToHaving(`${constructedAttribute} != 123`),
		]);

		// onChange with multiple operator
		await user.type(input, `${constructedAttribute} IN 123 123`);

		expect(input).toHaveValue(`${constructedAttribute} IN 123 123`);

		const optionWithMultipleValue = screen.getByTitle(optionTestTitle);
		await user.click(optionWithMultipleValue);

		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange).toHaveBeenCalledWith([
			transformFromStringToHaving(`${constructedAttribute} IN 123 123`),
		]);

		unmount();
	});
});
