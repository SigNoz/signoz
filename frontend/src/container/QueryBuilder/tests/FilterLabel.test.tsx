import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { FilterLabel } from '../components';

describe('QueryBuilder', () => {
	const labelText = 'Filter label text';
	it('should render the label text', () => {
		const { getByText } = render(<FilterLabel label={labelText} />);
		const labelElement = getByText(labelText);
		expect(labelElement).toBeInTheDocument();
	});

	it('should render FilterLabel', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<FilterLabel label={labelText} />
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
