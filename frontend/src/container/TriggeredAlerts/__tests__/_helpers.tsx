import { QueryClient, QueryClientProvider } from 'react-query';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render, RenderResult, screen } from '@testing-library/react';
import TriggeredAlerts from 'container/TriggeredAlerts';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { AppContext } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import { onNuqsUrlUpdate, resetNuqsState } from 'tests/nuqs-helpers';
import { TestRouter } from 'tests/router';
import { act, getAppContextMock, userEvent } from 'tests/test-utils';

export const SEARCH_INPUT = 'triggered-alerts-search-input-field';
// The 300 ms search debounce plus the URL write that follows it.
export const SEARCH_SETTLE_MS = 1000;

interface RenderOptions {
	initialRoute?: string;
}

export function renderTriggeredAlerts(
	options: RenderOptions = {},
): RenderResult {
	const { initialRoute = '/' } = options;

	const initialSearch = initialRoute.includes('?')
		? initialRoute.slice(initialRoute.indexOf('?'))
		: '';
	resetNuqsState(initialSearch);

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { refetchOnWindowFocus: false, retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<TestRouter initialRoute={initialRoute}>
			<NuqsTestingAdapter
				searchParams={initialSearch}
				onUrlUpdate={onNuqsUrlUpdate}
				rateLimitFactor={0}
				hasMemory
			>
				<QueryClientProvider client={queryClient}>
					<AppContext.Provider value={getAppContextMock('ADMIN')}>
						<TimezoneProvider>
							<VirtuosoMockContext.Provider
								value={{ viewportHeight: 800, itemHeight: 46 }}
							>
								<TriggeredAlerts />
							</VirtuosoMockContext.Provider>
						</TimezoneProvider>
					</AppContext.Provider>
				</QueryClientProvider>
			</NuqsTestingAdapter>
		</TestRouter>,
	);
}

export async function findAlertRow(alertName: string): Promise<HTMLElement> {
	const cell = await screen.findByText(alertName, {}, { timeout: 5000 });
	const row = cell.closest('tr');
	if (!row) {
		throw new Error(`Row not found for alert "${alertName}"`);
	}
	return row as HTMLElement;
}

export function getTriggeredAlertRowTestId(
	fingerprint: string,
	column: 'name' | 'severity' | 'status',
): string {
	return `alert-row-${fingerprint}-${column}`;
}

export async function search(text: string): Promise<void> {
	jest.useFakeTimers();
	const user = userEvent.setup({
		advanceTimers: (ms) => jest.advanceTimersByTime(ms),
	});
	await user.type(screen.getByTestId(SEARCH_INPUT), text);
	act(() => {
		jest.advanceTimersByTime(SEARCH_SETTLE_MS);
	});
}
