// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter, Route } from 'react-router-dom';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppContext } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import store from 'store';
import { getAppContextMock } from 'tests/test-utils';
import { CompatRouter } from 'react-router-dom-v5-compat';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: { refetchOnWindowFocus: false, retry: false },
		mutations: { retry: false },
	},
});

export const mockStore = configureStore([thunk]);

interface WrapperProps {
	children: React.ReactNode;
	initialSearchParams?: string;
	initialPath?: string;
	onUrlUpdate?: (event: { searchParams: URLSearchParams }) => void;
}

export function TestWrapper({
	children,
	initialSearchParams = '',
	initialPath = '/services',
	onUrlUpdate,
}: WrapperProps): JSX.Element {
	const initialEntry = initialSearchParams
		? `${initialPath}?${initialSearchParams}`
		: initialPath;

	const mockedStore = mockStore({
		...store.getState(),
		app: {
			...store.getState().app,
			role: 'ADMIN',
			user: {
				userId: 'test-user-id',
				email: 'test@signoz.io',
				name: 'TestUser',
				profilePictureURL: '',
				accessJwt: '',
				refreshJwt: '',
			},
			isLoggedIn: true,
		},
	});

	return (
		<MemoryRouter initialEntries={[initialEntry]}>
			<CompatRouter>
				<NuqsTestingAdapter
					searchParams={initialSearchParams}
					onUrlUpdate={onUrlUpdate}
				>
					<QueryClientProvider client={queryClient}>
						<Provider store={mockedStore}>
							<AppContext.Provider value={getAppContextMock('ADMIN')}>
								<TimezoneProvider>
									<QueryBuilderProvider>
										<Route path="*">{children}</Route>
									</QueryBuilderProvider>
								</TimezoneProvider>
							</AppContext.Provider>
						</Provider>
					</QueryClientProvider>
				</NuqsTestingAdapter>
			</CompatRouter>
		</MemoryRouter>
	);
}

export function createMockMoment(timestamp: number): {
	toDate: () => Date;
	toISOString: () => string;
	format: () => string;
	toString: () => string;
} {
	const date = new Date(timestamp);
	return {
		toDate: (): Date => date,
		toISOString: (): string => date.toISOString(),
		format: (): string => date.toISOString(),
		toString: (): string => date.toString(),
	};
}
