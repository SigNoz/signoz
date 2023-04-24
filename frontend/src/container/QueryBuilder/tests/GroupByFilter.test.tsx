import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { GroupByFilter } from '../filters';
import { queryMockData } from '../mock/queryData';

describe('QueryBuilder: groupBy Filter', () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
			},
		},
	});

	it('it should render GroupByFilter', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<QueryClientProvider client={queryClient}>
							<GroupByFilter
								onChange={jest.fn()}
								query={queryMockData}
								disabled={false}
							/>
						</QueryClientProvider>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
