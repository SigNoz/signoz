import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilder } from '../QueryBuilder';

describe('QueryBuilder', () => {
	it('renders the QueryBuilder component', () => {
		render(
			<QueryBuilder
				config={{
					queryVariant: 'static',
					initialDataSource: DataSource.METRICS,
				}}
				panelType="TIME_SERIES"
			/>,
		);
	});

	it('adds a new query when the "Query" button is clicked', () => {
		const { getByText } = render(
			<QueryBuilder
				config={{
					queryVariant: 'static',
					initialDataSource: DataSource.METRICS,
				}}
				panelType="TIME_SERIES"
			/>,
		);

		fireEvent.click(getByText('Query'));

		expect(getByText('Query')).toBeInTheDocument();
	});

	it('adds a new formula when the "Formula" button is clicked', () => {
		const { getByText } = render(
			<QueryBuilder
				config={{
					queryVariant: 'static',
					initialDataSource: DataSource.METRICS,
				}}
				panelType="TIME_SERIES"
			/>,
		);

		fireEvent.click(getByText('Formula'));

		expect(getByText('Formula')).toBeInTheDocument();
	});
});

describe('QueryBuilder', () => {
	it('should render QueryBuilder', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<QueryBuilder config={undefined} panelType="TIME_SERIES" />
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
