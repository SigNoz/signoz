import React, { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { AppContext } from 'providers/App/App';
import { IAppContext } from 'providers/App/types';
import { ErrorModalProvider } from 'providers/ErrorModalProvider';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import {
	QueryBuilderContext,
	QueryBuilderProvider,
} from 'providers/QueryBuilder';
import TimezoneProvider from 'providers/Timezone';
import configureStore from 'redux-mock-store';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import thunk from 'redux-thunk';
import store from 'store';
import { QueryBuilderContextType } from 'types/common/queryBuilder';
// import { MemoryRouter as V5MemoryRouter } from 'react-router-dom-v5-compat';

// Mock ResizeObserver
class ResizeObserverMock {
	observe(): void {}

	unobserve(): void {}

	disconnect(): void {}
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
		},
		mutations: {
			retry: false,
		},
	},
});

beforeEach(() => {
	// jest.useFakeTimers();
	jest.setSystemTime(new Date('2023-10-20'));
});

afterEach(() => {
	queryClient.clear();
	// jest.useRealTimers();
});

const mockStore = configureStore([thunk]);
const mockStored = (role?: string): any =>
	mockStore({
		...store.getState(),
		app: {
			...store.getState().app,
			role, // Use the role provided
			user: {
				userId: '6f532456-8cc0-4514-a93b-aed665c32b47',
				email: 'test@signoz.io',
				name: 'TestUser',
				profilePictureURL: '',
				accessJwt: '',
				refreshJwt: '',
			},
			isLoggedIn: true,
			org: [
				{
					createdAt: 0,
					hasOptedUpdates: false,
					id: 'xyz',
					isAnonymous: false,
					name: 'Test Inc. - India',
				},
			],
		},
	});

jest.mock('react-i18next', () => ({
	useTranslation: (): {
		t: (str: string) => string;
		i18n: {
			changeLanguage: () => Promise<void>;
		};
	} => ({
		t: (str: string): string => str,
		i18n: {
			changeLanguage: (): Promise<void> => new Promise(() => {}),
		},
	}),
}));

export { defaultFeatureFlags } from 'tests/fixtures/appContextMock';

export function getAppContextMock(
	role: string,
	appContextOverrides?: Partial<IAppContext>,
): IAppContext {
	return createAppContextMock(role, appContextOverrides, () => jest.fn());
}

export function AllTheProviders({
	children,
	role,
	appContextOverrides,
	queryBuilderOverrides,
	initialRoute,
}: {
	children: React.ReactNode;
	role?: string;
	appContextOverrides?: Partial<IAppContext>;
	queryBuilderOverrides?: Partial<QueryBuilderContextType>;
	initialRoute?: string;
}): ReactElement {
	// Set default values
	const roleValue = role || 'ADMIN';
	const appContextOverridesValue = appContextOverrides || {};
	const initialRouteValue = initialRoute || '/';

	const queryBuilderContent = queryBuilderOverrides ? (
		<QueryBuilderContext.Provider
			value={queryBuilderOverrides as QueryBuilderContextType}
		>
			{children}
		</QueryBuilderContext.Provider>
	) : (
		<QueryBuilderProvider>{children}</QueryBuilderProvider>
	);

	const appContextValue = getAppContextMock(roleValue, appContextOverridesValue);

	return (
		<MemoryRouter initialEntries={[initialRouteValue]}>
			<NuqsAdapter>
				<QueryClientProvider client={queryClient}>
					<Provider store={mockStored(roleValue)}>
						<AppContext.Provider value={appContextValue}>
							<ResourceProvider>
								<ErrorModalProvider>
									<TimezoneProvider>
										<TooltipProvider>
											<PreferenceContextProvider>
												{queryBuilderContent}
											</PreferenceContextProvider>
										</TooltipProvider>
									</TimezoneProvider>
								</ErrorModalProvider>
							</ResourceProvider>
						</AppContext.Provider>
					</Provider>
				</QueryClientProvider>
			</NuqsAdapter>
		</MemoryRouter>
	);
}

AllTheProviders.defaultProps = {
	role: 'ADMIN',
	appContextOverrides: {},
	queryBuilderOverrides: undefined,
	initialRoute: '/',
};

interface ProviderProps {
	role?: string;
	appContextOverrides?: Partial<IAppContext>;
	queryBuilderOverrides?: Partial<QueryBuilderContextType>;
	initialRoute?: string;
}

const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>,
	providerProps: ProviderProps = {},
): RenderResult => {
	const {
		role = 'ADMIN',
		appContextOverrides = {},
		queryBuilderOverrides,
		initialRoute = '/',
	} = providerProps;

	return render(ui, {
		wrapper: () => (
			<AllTheProviders
				role={role}
				appContextOverrides={appContextOverrides}
				queryBuilderOverrides={queryBuilderOverrides}
				initialRoute={initialRoute}
			>
				{ui}
			</AllTheProviders>
		),
		...options,
	});
};

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { customRender as render };
