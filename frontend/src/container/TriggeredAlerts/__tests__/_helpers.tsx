import { QueryClient, QueryClientProvider } from 'react-query';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render, RenderResult } from '@testing-library/react';
import TriggeredAlerts from 'container/TriggeredAlerts';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { AppContext } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import { onNuqsUrlUpdate, resetNuqsState } from 'tests/nuqs-helpers';
import { TestRouter } from 'tests/router';
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

export function getTriggeredAlertRowTestId(
	fingerprint: string,
	column: 'name' | 'severity' | 'status',
): string {
	return `alert-row-${fingerprint}-${column}`;
}
