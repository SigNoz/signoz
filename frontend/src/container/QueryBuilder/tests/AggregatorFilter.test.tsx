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

import { AggregatorFilter } from '../filters';

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
					id: '8fac746b',
					key: 'resource_signoz_collector_id',
					op: '=',
					value: ['1a5d3cc2-4b3e-4c7c-ad07-c4cdd739d1b9'],
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

	it('should render AggregatorFilter', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<QueryClientProvider client={queryClient}>
							<AggregatorFilter onChange={jest.fn()} query={query} />
						</QueryClientProvider>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
