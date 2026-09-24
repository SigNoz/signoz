import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
	NuqsTestingAdapter,
	OnUrlUpdateFunction,
	UrlUpdateEvent,
} from 'nuqs/adapters/testing';
import { AppContext } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import store from 'store';
import { getAppContextMock } from 'tests/test-utils';

import StatusFilter from './StatusFilter';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false },
		mutations: { retry: false },
	},
});

function renderStatusFilter({
	searchParams = {},
	onUrlUpdate,
}: {
	searchParams?: Record<string, string>;
	onUrlUpdate?: OnUrlUpdateFunction;
}): ReturnType<typeof render> {
	return render(
		<MemoryRouter>
			<TimezoneProvider>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<AppContext.Provider value={getAppContextMock('ADMIN')}>
							<NuqsTestingAdapter
								searchParams={searchParams}
								onUrlUpdate={onUrlUpdate}
							>
								<StatusFilter />
							</NuqsTestingAdapter>
						</AppContext.Provider>
					</Provider>
				</QueryClientProvider>
			</TimezoneProvider>
		</MemoryRouter>,
	);
}

describe('StatusFilter', () => {
	beforeEach(() => {
		queryClient.clear();
	});

	it('renders all status options', () => {
		renderStatusFilter({});

		expect(screen.getByText('Status')).toBeInTheDocument();
		expect(screen.getByRole('radio', { name: 'All' })).toBeInTheDocument();
		expect(screen.getByRole('radio', { name: 'Active' })).toBeInTheDocument();
		expect(screen.getByRole('radio', { name: 'Inactive' })).toBeInTheDocument();
	});

	it('selects "All" by default when no URL param', () => {
		renderStatusFilter({});

		const allButton = screen.getByRole('radio', { name: 'All' });
		expect(allButton).toHaveAttribute('aria-checked', 'true');
	});

	it('reads "active" from URL and shows Active selected', () => {
		renderStatusFilter({ searchParams: { statusFilter: 'active' } });

		const activeButton = screen.getByRole('radio', { name: 'Active' });
		expect(activeButton).toHaveAttribute('aria-checked', 'true');
	});

	it('reads "inactive" from URL and shows Inactive selected', () => {
		renderStatusFilter({ searchParams: { statusFilter: 'inactive' } });

		const inactiveButton = screen.getByRole('radio', { name: 'Inactive' });
		expect(inactiveButton).toHaveAttribute('aria-checked', 'true');
	});

	it('updates URL to "active" when Active clicked', async () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		renderStatusFilter({ onUrlUpdate });

		const activeButton = screen.getByRole('radio', { name: 'Active' });
		fireEvent.click(activeButton);

		await waitFor(() => {
			const statusFilterValue = onUrlUpdate.mock.calls
				.map((call) => call[0].searchParams.get('statusFilter'))
				.filter(Boolean)
				.pop();
			expect(statusFilterValue).toBe('active');
		});
	});

	it('updates URL to "inactive" when Inactive clicked', async () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		renderStatusFilter({ onUrlUpdate });

		const inactiveButton = screen.getByRole('radio', { name: 'Inactive' });
		fireEvent.click(inactiveButton);

		await waitFor(() => {
			const statusFilterValue = onUrlUpdate.mock.calls
				.map((call) => call[0].searchParams.get('statusFilter'))
				.filter(Boolean)
				.pop();
			expect(statusFilterValue).toBe('inactive');
		});
	});

	it('removes statusFilter from URL when All clicked', async () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		renderStatusFilter({
			searchParams: { statusFilter: 'active' },
			onUrlUpdate,
		});

		const allButton = screen.getByRole('radio', { name: 'All' });
		fireEvent.click(allButton);

		await waitFor(() => {
			const lastCall = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1];
			expect(lastCall[0].searchParams.get('statusFilter')).toBeNull();
		});
	});

	it('resets page when filter changes', async () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		renderStatusFilter({
			searchParams: { page: '3' },
			onUrlUpdate,
		});

		const activeButton = screen.getByRole('radio', { name: 'Active' });
		fireEvent.click(activeButton);

		await waitFor(() => {
			const lastCall = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1];
			const pageValue = lastCall[0].searchParams.get('page');
			// page=1 is default, so nuqs removes it from URL (null) or keeps as "1"
			expect(pageValue === null || pageValue === '1').toBe(true);
		});
	});
});
