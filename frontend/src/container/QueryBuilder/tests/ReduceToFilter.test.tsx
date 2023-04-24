import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { ReduceToFilter } from '../filters';

describe('QueryBuilder', () => {
	const query: IBuilderQueryForm = {
		dataSource: DataSource.METRICS,
		queryName: 'A',
		aggregateOperator: 'noop',
		aggregateAttribute: {
			key: 'signoz_latency_count',
			dataType: 'float64',
			type: 'tag',
			isColumn: true,
		},
		tagFilters: {
			items: [
				{
					id: '',
					key: '',
					op: '',
					value: [''],
				},
			],
			op: 'AND',
		},
		expression: '',
		disabled: false,
		having: [],
		stepInterval: 30,
		limit: 10,
		orderBy: [],
		groupBy: [],
		legend: '',
		reduceTo: '',
	};

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
			},
		},
	});

	it('should render ReduceToFilter', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<QueryClientProvider client={queryClient}>
							<ReduceToFilter onChange={jest.fn()} query={query} />
						</QueryClientProvider>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
