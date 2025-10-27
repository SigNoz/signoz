import { Color } from '@signozhq/design-tokens';
import { render } from '@testing-library/react';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { getUniversalNameFromMetricUnit } from 'components/YAxisUnitSelector/utils';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { TreemapViewType } from '../types';
import {
	formatDataForMetricsTable,
	getMetricsTableColumns,
	MetricTypeRenderer,
} from '../utils';

describe('metricsTableColumns', () => {
	const mockQueryFilters: TagFilter = {
		items: [],
		op: 'AND',
	};

	it('should have correct column definitions', () => {
		expect(getMetricsTableColumns(mockQueryFilters)).toHaveLength(6);

		// Metric Name column
		expect(getMetricsTableColumns(mockQueryFilters)[0].dataIndex).toBe(
			'metric_name',
		);
		expect(getMetricsTableColumns(mockQueryFilters)[0].width).toBe(400);
		expect(getMetricsTableColumns(mockQueryFilters)[0].sorter).toBe(false);

		// Description column
		expect(getMetricsTableColumns(mockQueryFilters)[1].dataIndex).toBe(
			'description',
		);
		expect(getMetricsTableColumns(mockQueryFilters)[1].width).toBe(400);

		// Type column
		expect(getMetricsTableColumns(mockQueryFilters)[2].dataIndex).toBe(
			'metric_type',
		);
		expect(getMetricsTableColumns(mockQueryFilters)[2].width).toBe(150);
		expect(getMetricsTableColumns(mockQueryFilters)[2].sorter).toBe(false);

		// Unit column
		expect(getMetricsTableColumns(mockQueryFilters)[3].dataIndex).toBe('unit');
		expect(getMetricsTableColumns(mockQueryFilters)[3].width).toBe(150);

		// Samples column
		expect(getMetricsTableColumns(mockQueryFilters)[4].dataIndex).toBe(
			TreemapViewType.SAMPLES,
		);
		expect(getMetricsTableColumns(mockQueryFilters)[4].width).toBe(150);
		expect(getMetricsTableColumns(mockQueryFilters)[4].sorter).toBe(true);

		// Time Series column
		expect(getMetricsTableColumns(mockQueryFilters)[5].dataIndex).toBe(
			TreemapViewType.TIMESERIES,
		);
		expect(getMetricsTableColumns(mockQueryFilters)[5].width).toBe(150);
		expect(getMetricsTableColumns(mockQueryFilters)[5].sorter).toBe(true);
	});

	describe('MetricTypeRenderer', () => {
		it('should render correct icon and color for each metric type', () => {
			const types = [
				{
					type: MetricType.SUM,
					color: Color.BG_ROBIN_500,
				},
				{
					type: MetricType.GAUGE,
					color: Color.BG_SAKURA_500,
				},
				{
					type: MetricType.HISTOGRAM,
					color: Color.BG_SIENNA_500,
				},
				{
					type: MetricType.SUMMARY,
					color: Color.BG_FOREST_500,
				},
				{
					type: MetricType.EXPONENTIAL_HISTOGRAM,
					color: Color.BG_AQUA_500,
				},
			];

			types.forEach(({ type, color }) => {
				const { container } = render(<MetricTypeRenderer type={type} />);
				const rendererDiv = container.firstChild as HTMLElement;

				expect(rendererDiv).toHaveStyle({
					backgroundColor: `${color}33`,
					border: `1px solid ${color}`,
					color,
				});
			});
		});

		it('should return empty icon and color for unknown metric type', () => {
			const { container } = render(
				<MetricTypeRenderer type={'UNKNOWN' as MetricType} />,
			);
			const rendererDiv = container.firstChild as HTMLElement;

			expect(rendererDiv.querySelector('svg')).toBeNull();
		});
	});
});

describe('formatDataForMetricsTable', () => {
	it('should format metrics data correctly', () => {
		const mockData = [
			{
				metric_name: 'test_metric',
				description: 'Test description',
				type: MetricType.GAUGE,
				unit: 'bytes',
				[TreemapViewType.SAMPLES]: 1000,
				[TreemapViewType.TIMESERIES]: 2000,
				lastReceived: '2023-01-01T00:00:00Z',
			},
		];

		const result = formatDataForMetricsTable(mockData);

		expect(result).toHaveLength(1);
		expect(result[0].key).toBe('test_metric');

		// Verify metric name rendering
		const metricNameElement = result[0].metric_name as JSX.Element;
		const { container: metricNameWrapper } = render(metricNameElement);
		expect(metricNameWrapper.textContent).toBe('test_metric');

		// Verify description rendering
		const descriptionElement = result[0].description as JSX.Element;
		const { container: descriptionWrapper } = render(descriptionElement);
		expect(descriptionWrapper.textContent).toBe('Test description');
		expect(descriptionWrapper.querySelector('.description-tooltip')).toBeTruthy();

		// Verify metric type rendering
		const metricTypeElement = result[0].metric_type as JSX.Element;
		const { container: metricTypeWrapper } = render(metricTypeElement);
		expect(metricTypeWrapper.querySelector('.metric-type-renderer')).toBeTruthy();

		// Verify unit rendering
		const unitElement = result[0].unit as JSX.Element;
		const { container: unitWrapper } = render(unitElement);
		expect(unitWrapper.textContent).toBe(getUniversalNameFromMetricUnit('bytes'));

		// Verify samples rendering
		const samplesElement = result[0][TreemapViewType.SAMPLES] as JSX.Element;
		const { container: samplesWrapper } = render(samplesElement);
		expect(samplesWrapper.textContent).toBe('1K+');

		// Verify timeseries rendering
		const timeseriesElement = result[0][
			TreemapViewType.TIMESERIES
		] as JSX.Element;
		const { container: timeseriesWrapper } = render(timeseriesElement);
		expect(timeseriesWrapper.textContent).toBe('2K+');
	});

	it('should handle empty/null values', () => {
		const mockData = [
			{
				metric_name: '',
				description: '',
				type: MetricType.GAUGE,
				unit: '',
				[TreemapViewType.SAMPLES]: 0,
				[TreemapViewType.TIMESERIES]: 0,
				lastReceived: '2023-01-01T00:00:00Z',
			},
		];

		const result = formatDataForMetricsTable(mockData);

		// Verify empty metric name rendering
		const metricNameElement = result[0].metric_name as JSX.Element;
		const { container: metricNameWrapper } = render(metricNameElement);
		expect(metricNameWrapper.textContent).toBe('-');

		// Verify null description rendering
		const descriptionElement = result[0].description as JSX.Element;
		const { container: descriptionWrapper } = render(descriptionElement);
		expect(descriptionWrapper.textContent).toBe('-');

		// Verify null unit rendering
		const unitElement = result[0].unit as JSX.Element;
		const { container: unitWrapper } = render(unitElement);
		expect(unitWrapper.textContent).toBe('-');

		// Verify zero samples rendering
		const samplesElement = result[0][TreemapViewType.SAMPLES] as JSX.Element;
		const { container: samplesWrapper } = render(samplesElement);
		expect(samplesWrapper.textContent).toBe('-');

		// Verify zero timeseries rendering
		const timeseriesElement = result[0][
			TreemapViewType.TIMESERIES
		] as JSX.Element;
		const { container: timeseriesWrapper } = render(timeseriesElement);
		expect(timeseriesWrapper.textContent).toBe('-');
	});
});
