import { render } from '@testing-library/react';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import LogsExplorer from '..';

jest.mock(
	'container/TimeSeriesView/TimeSeriesView',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>Time Series Chart</div>;
		},
);

jest.mock('constants/panelTypes', () => ({
	AVAILABLE_EXPORT_PANEL_TYPES: ['graph', 'table'],
}));

jest.mock('d3-interpolate', () => ({
	interpolate: jest.fn(),
}));

jest.mock(
	'container/LogsExplorerChart',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>Histogram</div>;
		},
);

describe('Logs Explorer Tests', () => {
	test('Logs Explorer default view test', () => {
		const { container } = render(
			<MemoryRouter>
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

		expect(container).toMatchSnapshot();
	});
});
