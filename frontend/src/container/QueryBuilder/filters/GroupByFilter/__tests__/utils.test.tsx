import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialQueryBuilderFormValues } from 'constants/queryBuilder';
import { GROUP_BY_OPTION_ID, GROUP_BY_SELECT_ID } from 'constants/testIds';
import { QueryClientProvider } from 'react-query';
import { queryClient } from 'services/queryClient.service';

import { GroupByFilter } from '../GroupByFilter';

beforeEach(() => {
	const mockOnChange = jest.fn();

	render(
		<QueryClientProvider client={queryClient}>
			<GroupByFilter
				onChange={mockOnChange}
				query={initialQueryBuilderFormValues}
				disabled={false}
			/>
		</QueryClientProvider>,
	);
});

afterEach(() => {
	cleanup();
});

describe('GroupBy filter behaviour', () => {
	test('Correct render the GroupBy filter component', () => {
		const select = screen.getByTestId(GROUP_BY_SELECT_ID);

		expect(select).toBeInTheDocument();
	});

	test('Test onChange GroupBy filter', async () => {
		// TODO: add here mock server for getting keys and prepating options
		const user = userEvent.setup();

		const input = screen.getByRole('combobox');

		await user.click(input);

		const options = await screen.findAllByTitle(GROUP_BY_OPTION_ID);

		console.log(options);

		// TODO: test onChange event and changing the query.groupBy array of the chosen values
	});
});
