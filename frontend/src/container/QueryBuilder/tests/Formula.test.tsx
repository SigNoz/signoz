import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { Formula } from '../components';

describe('QueryBuilder', () => {
	const formula = {
		label: 'Formula',
		expression: 'sum(A, B)',
		legend: 'Total',
		disabled: false,
	};
	it('should render Formula', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<Formula formula={formula} index={0} />
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
