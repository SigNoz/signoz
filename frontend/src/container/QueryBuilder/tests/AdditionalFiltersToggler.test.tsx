import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { AdditionalFiltersToggler } from '../components';

describe('QueryBuilder: Toggler for Additional Filters', () => {
	it('it should render AdditionalFiltersToggler', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<AdditionalFiltersToggler listOfAdditionalFilter={[]}>
							Testing AdditionalFiltersToggler
						</AdditionalFiltersToggler>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
