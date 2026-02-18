import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { MetricsexplorertypesTreemapModeDTO } from 'api/generated/services/sigNoz.schemas';
import store from 'store';

import MetricsTreemap from '../MetricsTreemap';

jest.mock('d3-hierarchy', () => ({
	stratify: jest.fn().mockReturnValue({
		id: jest.fn().mockReturnValue({
			parentId: jest.fn().mockReturnValue(
				jest.fn().mockReturnValue({
					sum: jest.fn().mockReturnValue({
						descendants: jest.fn().mockReturnValue([]),
						eachBefore: jest.fn().mockReturnValue([]),
					}),
				}),
			),
		}),
	}),
	treemapBinary: jest.fn(),
}));
jest.mock('react-use', () => ({
	useWindowSize: jest.fn().mockReturnValue({ width: 1000, height: 1000 }),
}));

const mockData = [
	{
		metricName: 'Metric 1',
		percentage: 0.5,
		totalValue: 15,
	},
	{
		metricName: 'Metric 2',
		percentage: 0.6,
		totalValue: 10,
	},
];

describe('MetricsTreemap', () => {
	it('renders treemap with data correctly', () => {
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTreemap
						isLoading={false}
						isError={false}
						data={{
							timeseries: [mockData[0]],
							samples: [mockData[1]],
						}}
						openMetricDetails={jest.fn()}
						viewType={MetricsexplorertypesTreemapModeDTO.samples}
						setHeatmapView={jest.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(screen.getByText('Proportion View')).toBeInTheDocument();
	});

	it('shows loading state', () => {
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTreemap
						isLoading
						isError={false}
						data={{
							timeseries: [mockData[0]],
							samples: [mockData[1]],
						}}
						openMetricDetails={jest.fn()}
						viewType={MetricsexplorertypesTreemapModeDTO.samples}
						setHeatmapView={jest.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(
			screen.getByTestId('metrics-treemap-loading-state'),
		).toBeInTheDocument();
	});

	it('shows error state', () => {
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTreemap
						isLoading={false}
						isError
						data={{
							timeseries: [mockData[0]],
							samples: [mockData[1]],
						}}
						openMetricDetails={jest.fn()}
						viewType={MetricsexplorertypesTreemapModeDTO.samples}
						setHeatmapView={jest.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('metrics-treemap-error-state')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Error fetching metrics. If the problem persists, please contact support.',
			),
		).toBeInTheDocument();
	});

	it('shows empty state when no data', () => {
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTreemap
						isLoading={false}
						isError={false}
						data={null}
						openMetricDetails={jest.fn()}
						viewType={MetricsexplorertypesTreemapModeDTO.samples}
						setHeatmapView={jest.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('metrics-treemap-empty-state')).toBeInTheDocument();
		expect(screen.getByText('No metrics found')).toBeInTheDocument();
	});
});
