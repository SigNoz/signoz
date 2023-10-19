import { render, RenderOptions, RenderResult } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import React, { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from 'store';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

afterEach(() => {
	queryClient.clear();
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
}: {
	children: React.ReactNode;
}): ReactElement {
	return (
		<ResourceProvider>
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<BrowserRouter>{children}</BrowserRouter>
				</Provider>
			</QueryClientProvider>
		</ResourceProvider>
	);
}

const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
