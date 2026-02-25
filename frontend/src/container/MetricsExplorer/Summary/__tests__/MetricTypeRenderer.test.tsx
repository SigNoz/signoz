import { Color } from '@signozhq/design-tokens';
import { render, screen } from '@testing-library/react';
import { MetricType } from 'api/metricsExplorer/getMetricsList';

import MetricTypeRenderer from '../MetricTypeRenderer';

jest.mock('lucide-react', () => {
	return {
		__esModule: true,
		Diff: (): JSX.Element => <svg data-testid="diff-icon" />,
		Gauge: (): JSX.Element => <svg data-testid="gauge-icon" />,
		BarChart2: (): JSX.Element => <svg data-testid="bar-chart-2-icon" />,
		BarChartHorizontal: (): JSX.Element => (
			<svg data-testid="bar-chart-horizontal-icon" />
		),
		BarChart: (): JSX.Element => <svg data-testid="bar-chart-icon" />,
	};
});

describe('MetricTypeRenderer', () => {
	it('should render correct icon and color for each metric type', () => {
		const types = [
			{
				type: MetricType.SUM,
				color: Color.BG_ROBIN_500,
				iconTestId: 'diff-icon',
			},
			{
				type: MetricType.GAUGE,
				color: Color.BG_SAKURA_500,
				iconTestId: 'gauge-icon',
			},
			{
				type: MetricType.HISTOGRAM,
				color: Color.BG_SIENNA_500,
				iconTestId: 'bar-chart-2-icon',
			},
			{
				type: MetricType.SUMMARY,
				color: Color.BG_FOREST_500,
				iconTestId: 'bar-chart-horizontal-icon',
			},
			{
				type: MetricType.EXPONENTIAL_HISTOGRAM,
				color: Color.BG_AQUA_500,
				iconTestId: 'bar-chart-icon',
			},
		];

		types.forEach(({ type, color, iconTestId }) => {
			const { container } = render(<MetricTypeRenderer type={type} />);
			const rendererDiv = container.firstChild as HTMLElement;

			expect(rendererDiv).toHaveStyle({
				backgroundColor: `${color}33`,
				border: `1px solid ${color}`,
				color,
			});

			expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
		});
	});
});
