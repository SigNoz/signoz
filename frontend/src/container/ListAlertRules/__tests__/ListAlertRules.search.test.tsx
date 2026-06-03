import userEvent from '@testing-library/user-event';
import { screen, waitFor } from 'tests/test-utils';
import { getCurrentNuqsQueryString } from 'tests/nuqs-helpers';

import { renderListAlertRules } from './_helpers';

function getSearchInput(): HTMLInputElement {
	return screen.getByTestId('list-alerts-search-input') as HTMLInputElement;
}

describe('ListAlertRules — search', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('filters rows by alert name with debounce', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await user.clear(getSearchInput());
		await user.type(getSearchInput(), 'CPU');

		await waitFor(() => {
			expect(screen.getByText('High CPU Alert')).toBeInTheDocument();
			expect(screen.queryByText('Memory Pending Alert')).not.toBeInTheDocument();
		});
	});

	it('filters rows by label values (severity)', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await user.clear(getSearchInput());
		await user.type(getSearchInput(), 'warning');

		await waitFor(() => {
			expect(screen.getByText('Memory Pending Alert')).toBeInTheDocument();
			expect(screen.queryByText('High CPU Alert')).not.toBeInTheDocument();
		});
	});

	it('restores all rows when search is cleared', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await user.clear(getSearchInput());
		await user.type(getSearchInput(), 'CPU');

		await waitFor(() => {
			expect(screen.queryByText('Memory Pending Alert')).not.toBeInTheDocument();
		});

		await user.clear(getSearchInput());

		await waitFor(() => {
			expect(screen.getByText('High CPU Alert')).toBeInTheDocument();
			expect(screen.getByText('Memory Pending Alert')).toBeInTheDocument();
			expect(screen.getByText('Healthy Alert')).toBeInTheDocument();
		});
	});

	it('shows no-results state when no match', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await user.clear(getSearchInput());
		await user.type(getSearchInput(), 'zzzzzz-no-match');

		await waitFor(() => {
			expect(screen.getByTestId('no-results-empty-state')).toBeInTheDocument();
			expect(screen.getByTestId('no-results-title')).toHaveTextContent(
				'No matching alert rules',
			);
		});
	});

	it('resets page to 1 when search debounce fires', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules({ initialRoute: '/?page=2' });

		// Page 2 of the 4-rule fixture has no rows; we only need the search input
		// to be mounted, which happens before data is fetched.
		const input = await screen.findByTestId('list-alerts-search-input');
		await user.clear(input);
		await user.type(input, 'CPU');

		await waitFor(() => {
			expect(getCurrentNuqsQueryString()).not.toContain('page=2');
		});
	});
});
