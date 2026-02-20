import { Color } from '@signozhq/design-tokens';
import { render } from '@testing-library/react';
import { MetricType } from 'api/metricsExplorer/getMetricsList';

import MetricTypeRenderer from '../MetricTypeRenderer';

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
