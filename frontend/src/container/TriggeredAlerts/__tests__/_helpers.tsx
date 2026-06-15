import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render, RenderResult, screen } from '@testing-library/react';
import TriggeredAlerts from 'container/TriggeredAlerts';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { AppContext } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import { onNuqsUrlUpdate, resetNuqsState } from 'tests/nuqs-helpers';
import { getAppContextMock } from 'tests/test-utils';

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
		<MemoryRouter initialEntries={[initialRoute]}>
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
		</MemoryRouter>,
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
