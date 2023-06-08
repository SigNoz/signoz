import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEBOUNCE_DELAY } from 'constants/common';
import { initialQueryBuilderFormValues } from 'constants/queryBuilder';
import { GROUP_BY_OPTION_ID } from 'constants/testIds';
import { transformGroupByFilterValues } from 'lib/query/transformGroupByFilterValues';
import { mockAttributeKeys } from 'mocks/data/mockAttributeKeys';
import { QueryClientProvider } from 'react-query';
import { queryClient } from 'services/queryClient.service';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { GroupByFilter } from '../GroupByFilter';

const groupByQueryTraces: IBuilderQuery = {
	...initialQueryBuilderFormValues,
	dataSource: DataSource.TRACES,
};

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe('GroupBy filter behaviour', () => {
	test('Correct render the GroupBy filter component', () => {
		const mockOnChange = jest.fn();

		render(
			<QueryClientProvider client={queryClient}>
				<GroupByFilter
					onChange={mockOnChange}
					query={initialQueryBuilderFormValues}
					disabled={
						initialQueryBuilderFormValues.dataSource === DataSource.METRICS &&
						!initialQueryBuilderFormValues.aggregateAttribute.key
					}
				/>
			</QueryClientProvider>,
		);

		const input = screen.getByRole('combobox');

		expect(input).toBeInTheDocument();
		expect(input).toBeDisabled();
	});

	test('Test onChange GroupBy filter', async () => {
		const mockOnChange = jest.fn();
		const user = userEvent.setup({ delay: null });

		render(
			<QueryClientProvider client={queryClient}>
				<GroupByFilter
					onChange={mockOnChange}
					query={groupByQueryTraces}
					disabled={
						groupByQueryTraces.dataSource === DataSource.METRICS &&
						!groupByQueryTraces.aggregateAttribute.key
					}
				/>
			</QueryClientProvider>,
		);

		act(() => {
			jest.advanceTimersByTime(DEBOUNCE_DELAY);
		});

		const input = screen.getByRole('combobox');

		expect(input).toBeEnabled();

		await user.click(input);

		expect(input).toHaveFocus();

		const options = await screen.findAllByTestId(GROUP_BY_OPTION_ID);

		expect(options.length).toEqual(mockAttributeKeys.data.attributeKeys?.length);

		await user.clear(input);
		await user.click(input);
		await user.type(input, '3');

		act(() => {
			jest.advanceTimersByTime(DEBOUNCE_DELAY);
		});

		await act(async () => {
			Promise.resolve();
		});

		const newFilteredOptions = screen.getAllByTestId(GROUP_BY_OPTION_ID);

		expect(newFilteredOptions.length).toEqual(1);

		await user.clear(input);
		await user.click(newFilteredOptions[0]);

		const transformedData = transformGroupByFilterValues([
			{
				label: newFilteredOptions[0].textContent || '',
				value: newFilteredOptions[0].title,
			},
		]);

		expect(mockOnChange.mock.calls[0][0]).toEqual(transformedData);
	});
});
