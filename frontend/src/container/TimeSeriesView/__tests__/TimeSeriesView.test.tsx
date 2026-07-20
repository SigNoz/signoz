import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import store from 'store';
import { DataSource } from 'types/common/queryBuilder';

import TimeSeriesView from '../TimeSeriesView';

jest.mock('components/Uplot', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="uplot-chart" />,
}));

jest.mock('components/ExportMenu/ExportMenu', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="timeseries-export-menu" />,
}));

jest.mock('container/QueryBuilder/filters/BuilderUnitsFilter', () => ({
	BuilderUnitsFilter: (): JSX.Element => (
		<div data-testid="builder-units-filter" />
	),
}));

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({ currentQuery: null }),
}));

jest.mock('lib/uPlotLib/getUplotChartOptions', () => ({
	getUPlotChartOptions: (): unknown => ({}),
}));

jest.mock('lib/uPlotLib/utils/getUplotChartData', () => ({
	getUPlotChartData: (): number[][] => [
		[1, 2],
		[3, 4],
	],
}));

jest.mock(
	'container/DashboardContainer/visualization/charts/utils/stackSeriesUtils',
	() => ({ stackSeries: (): unknown => ({ data: [], bands: [] }) }),
);

jest.mock('container/GridCardLayout/GridCard/utils', () => ({
	getLocalStorageGraphVisibilityState: (): unknown => ({
		graphVisibilityStates: [],
	}),
}));

jest.mock('providers/Timezone', () => ({
	useTimezone: (): unknown => ({ timezone: { value: 'UTC' } }),
}));

jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: (): unknown => ({ width: 800, height: 400 }),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockStore = configureStore([])({ ...store.getState() });

const rawV5Response = {
	type: 'time_series',
	data: { results: [] },
	meta: {},
};

function makeData(withRawV5: boolean): any {
	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: { data: { result: [], resultType: '' } },
		...(withRawV5 ? { rawV5Response, legendMap: {} } : {}),
	};
}

function renderView(props: {
	allowExport?: boolean;
	withRawV5?: boolean;
	onYAxisUnitChange?: (value: string) => void;
}): ReturnType<typeof render> {
	const { allowExport, withRawV5 = true, onYAxisUnitChange } = props;
	return render(
		<Provider store={mockStore}>
			<MemoryRouter>
				<TimeSeriesView
					isLoading={false}
					isError={false}
					isFilterApplied
					dataSource={DataSource.LOGS}
					data={makeData(withRawV5)}
					allowExport={allowExport}
					onYAxisUnitChange={onYAxisUnitChange}
				/>
			</MemoryRouter>
		</Provider>,
	);
}

describe('TimeSeriesView header gating', () => {
	it('renders the export menu when allowExport is set and raw V5 data is present', () => {
		const { queryByTestId } = renderView({ allowExport: true });
		expect(queryByTestId('timeseries-export-menu')).toBeInTheDocument();
	});

	it('renders no export menu without allowExport', () => {
		const { queryByTestId } = renderView({});
		expect(queryByTestId('timeseries-export-menu')).not.toBeInTheDocument();
	});

	it('renders no export menu when the raw V5 response is missing', () => {
		const { queryByTestId } = renderView({ allowExport: true, withRawV5: false });
		expect(queryByTestId('timeseries-export-menu')).not.toBeInTheDocument();
	});

	it('renders the unit selector only when onYAxisUnitChange is passed', () => {
		const withUnit = renderView({ onYAxisUnitChange: jest.fn() });
		expect(withUnit.queryByTestId('builder-units-filter')).toBeInTheDocument();
		withUnit.unmount();

		const withoutUnit = renderView({ allowExport: true });
		expect(
			withoutUnit.queryByTestId('builder-units-filter'),
		).not.toBeInTheDocument();
	});

	it('renders no header row when neither export nor unit selector is enabled', () => {
		const { container } = renderView({ withRawV5: false });
		expect(container.querySelector('.time-series-view__header')).toBeNull();
	});
});
