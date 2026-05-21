// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter, Route } from 'react-router-dom';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { QueryClient, QueryClientProvider } from 'react-query';
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { parseAsString, useQueryState } from 'nuqs';
import { AppContext } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import store from 'store';
import { getAppContextMock } from 'tests/test-utils';
import { CompatRouter } from 'react-router-dom-v5-compat';

import DateTimeSelection from '../index';
import {
	__resetSearchParamsGetter,
	__setSearchParamsGetterForTest,
} from '../utils/getUnstableCurrentSearchParams';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { refetchOnWindowFocus: false, retry: false },
		mutations: { retry: false },
	},
});

const mockStore = configureStore([thunk]);

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

jest.mock('components/CustomTimePicker/CustomTimePicker', () => ({
	__esModule: true,
	default: ({
		onSelect,
	}: {
		onSelect: (value: string) => void;
	}): JSX.Element => (
		<div data-testid="custom-time-picker">
			<button
				type="button"
				data-testid="select-1h"
				onClick={(): void => onSelect('1h')}
			>
				1h
			</button>
		</div>
	),
}));

jest.mock('container/NewExplorerCTA', () => ({
	__esModule: true,
	default: (): null => null,
}));

function NuqsParamSetter({ paramValue }: { paramValue: string }): JSX.Element {
	const [, setYAxisUnit] = useQueryState(
		'yAxisUnit',
		parseAsString.withDefault(''),
	);

	return (
		<button
			type="button"
			data-testid="set-nuqs-param"
			onClick={(): void => {
				setYAxisUnit(paramValue);
			}}
		>
			Set yAxisUnit
		</button>
	);
}

interface WrapperProps {
	children: React.ReactNode;
	initialSearchParams?: string;
	initialPath?: string;
	onUrlUpdate?: (event: { searchParams: URLSearchParams }) => void;
}

function TestWrapper({
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

describe('REGRESSION: DateTimeSelectionV2 preserves nuqs query params on time change', () => {
	let currentSearchParams: URLSearchParams;

	beforeEach(() => {
		jest.clearAllMocks();
		mockSafeNavigate.mockClear();
		queryClient.clear();

		// Initialize with test's initial search params
		currentSearchParams = new URLSearchParams('relativeTime=30m');
		__setSearchParamsGetterForTest(() => currentSearchParams);
	});

	afterEach(() => {
		__resetSearchParamsGetter();
	});

	it('should preserve yAxisUnit param set via nuqs when changing time selection', async () => {
		render(
			<TestWrapper
				initialSearchParams="relativeTime=30m"
				onUrlUpdate={(event): void => {
					// Sync nuqs URL updates to our mock getter
					// This simulates how window.location.search would be updated in real browser
					currentSearchParams = event.searchParams;
				}}
			>
				<NuqsParamSetter paramValue="bytes" />
				<DateTimeSelection showAutoRefresh />
			</TestWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
		});

		act(() => {
			fireEvent.click(screen.getByTestId('set-nuqs-param'));
		});

		await waitFor(() => {
			expect(currentSearchParams.get('yAxisUnit')).toBe('bytes');
		});

		mockSafeNavigate.mockClear();

		act(() => {
			fireEvent.click(screen.getByTestId('select-1h'));
		});

		await waitFor(() => {
			expect(mockSafeNavigate).toHaveBeenCalled();
		});

		const navigatedUrl = mockSafeNavigate.mock.calls[
			mockSafeNavigate.mock.calls.length - 1
		][0] as string;

		expect(navigatedUrl).toContain('relativeTime=1h');
		expect(navigatedUrl).toContain('yAxisUnit=bytes');
	});
});
