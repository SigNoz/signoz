import { render, RenderOptions, RenderResult } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import React, { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import store from 'store';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(new Date('2023-10-20'));
});

afterEach(() => {
	queryClient.clear();
	jest.useRealTimers();
});

const mockStore = configureStore([]);

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

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.TRACES_EXPLORER}/`,
	}),
}));

function AllTheProviders({
	children,
	role, // Accept the role as a prop
}: {
	children: React.ReactNode;
	role: string; // Define the role prop
}): ReactElement {
	return (
		<ResourceProvider>
			<QueryClientProvider client={queryClient}>
				<Provider store={mockStored(role)}>
					{' '}
					{/* Use the mock store with the provided role */}
					<BrowserRouter>{children}</BrowserRouter>
				</Provider>
			</QueryClientProvider>
		</ResourceProvider>
	);
}

const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>,
	role = 'ADMIN', // Set a default role
): RenderResult =>
	render(ui, {
		wrapper: () => <AllTheProviders role={role}>{ui}</AllTheProviders>,
		...options,
	});

export * from '@testing-library/react';
export { customRender as render };
