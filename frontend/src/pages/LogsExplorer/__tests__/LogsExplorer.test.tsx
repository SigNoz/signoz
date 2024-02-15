import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import LogsExplorer from '..';

// mocking the graph components in this test as this should be handled separately
jest.mock(
	'container/TimeSeriesView/TimeSeriesView',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>Time Series Chart</div>;
		},
);
jest.mock(
	'container/LogsExplorerChart',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>Histogram Chart</div>;
		},
);

jest.mock('constants/panelTypes', () => ({
	AVAILABLE_EXPORT_PANEL_TYPES: ['graph', 'table'],
}));

jest.mock('d3-interpolate', () => ({
	interpolate: jest.fn(),
}));

describe('Logs Explorer Tests', () => {
	test('Logs Explorer default view test without data', async () => {
		const {
			getByText,
			getByRole,
			queryByText,
			getByTestId,
			queryByTestId,
		} = render(
			<MemoryRouter initialEntries={['/logs/logs-explorer']}>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<MockQueryClientProvider>
							<QueryBuilderProvider>
								<LogsExplorer />
							</QueryBuilderProvider>
						</MockQueryClientProvider>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);

		// check the presence of histogram chart
		expect(getByText('Histogram Chart')).toBeInTheDocument();

		// toggle the chart and check it gets removed from the DOM
		const histogramToggle = getByRole('switch');
		await userEvent.click(histogramToggle);
		expect(queryByText('Histogram Chart')).not.toBeInTheDocument();

		// check the presence of search bar and query builder and absence of clickhouse
		const searchView = getByTestId('search-view');
		expect(searchView).toBeInTheDocument();
		const queryBuilderView = getByTestId('query-builder-view');
		expect(queryBuilderView).toBeInTheDocument();
		const clickhouseView = queryByTestId('clickhouse-view');
		expect(clickhouseView).not.toBeInTheDocument();

		// check the presence of List View / Time Series View / Table View
		const listView = getByTestId('logs-list-view');
		const timeSeriesView = getByTestId('time-series-view');
		const tableView = getByTestId('table-view');
		expect(listView).toBeInTheDocument();
		expect(timeSeriesView).toBeInTheDocument();
		expect(tableView).toBeInTheDocument();

		// check the presence of old logs explorer CTA
		const oldLogsCTA = getByText('Switch to Old Logs Explorer');
		expect(oldLogsCTA).toBeInTheDocument();
	});
});
