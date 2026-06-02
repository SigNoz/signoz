import { fireEvent, screen, waitFor } from 'tests/test-utils';
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
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		fireEvent.change(getSearchInput(), { target: { value: 'CPU' } });

		await waitFor(() => {
			expect(screen.getByText('High CPU Alert')).toBeInTheDocument();
			expect(screen.queryByText('Memory Pending Alert')).not.toBeInTheDocument();
		});
	});

	it('filters rows by label values (severity)', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		fireEvent.change(getSearchInput(), { target: { value: 'warning' } });

		await waitFor(() => {
			expect(screen.getByText('Memory Pending Alert')).toBeInTheDocument();
			expect(screen.queryByText('High CPU Alert')).not.toBeInTheDocument();
		});
	});

	it('restores all rows when search is cleared', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		fireEvent.change(getSearchInput(), { target: { value: 'CPU' } });

		await waitFor(() => {
			expect(screen.queryByText('Memory Pending Alert')).not.toBeInTheDocument();
		});

		fireEvent.change(getSearchInput(), { target: { value: '' } });

		await waitFor(() => {
			expect(screen.getByText('High CPU Alert')).toBeInTheDocument();
			expect(screen.getByText('Memory Pending Alert')).toBeInTheDocument();
			expect(screen.getByText('Healthy Alert')).toBeInTheDocument();
		});
	});

	it('shows no-results state when no match', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		fireEvent.change(getSearchInput(), {
			target: { value: 'zzzzzz-no-match' },
		});

		await waitFor(() => {
			expect(screen.getByTestId('no-results-empty-state')).toBeInTheDocument();
			expect(screen.getByTestId('no-results-title')).toHaveTextContent(
				'No matching alert rules',
			);
		});
	});

	it('resets page to 1 when search debounce fires', async () => {
		renderListAlertRules({ initialRoute: '/?page=2' });

		// Page 2 of the 4-rule fixture has no rows; we only need the search input
		// to be mounted, which happens before data is fetched.
		const input = await screen.findByTestId('list-alerts-search-input');
		fireEvent.change(input, { target: { value: 'CPU' } });

		await waitFor(() => {
			expect(getCurrentNuqsQueryString()).not.toContain('page=2');
		});
	});
});
