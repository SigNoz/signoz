import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import AggregateEveryFilter from '../filters/AggregateEveryFilter';
import { queryMockData } from '../mock/queryData';

describe('QueryBuilder: Aggregate Every Filter', () => {
	it('it should render AggregateEveryFilter', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<AggregateEveryFilter onChange={jest.fn()} query={queryMockData} />
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
