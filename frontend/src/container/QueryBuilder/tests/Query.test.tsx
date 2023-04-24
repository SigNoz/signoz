import { render } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { Query } from '../components';
import { queryMockData } from '../mock/queryData';

describe('QueryBuilder: Main Query wrapper', () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
			},
		},
	});

	it('it should render Query', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<QueryClientProvider client={queryClient}>
							<Query
								index={0}
								isAvailableToDisable={false}
								queryVariant="static"
								query={queryMockData}
								panelType={PANEL_TYPES.TIME_SERIES}
							/>
						</QueryClientProvider>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
