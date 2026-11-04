import type {
	DashboardtypesPanelSpecDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { resolveSeriesColor } from 'lib/visualization/charts/Distribution/utils';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { resolveDistributionLegendSeries } from '../legendSeries';

describe('resolveDistributionLegendSeries', () => {
	it('keys each group by the label and default colour the chart draws it with', () => {
		const data = {
			response: {
				data: {
					type: 'distribution',
					data: {
						results: [
							{
								queryName: 'A',
								aggregations: [
									{
										index: 0,
										meta: { buckets: [1] },
										distributions: [
											{
												labels: [{ key: { name: 'service' }, value: 'cart' }],
												counts: [1, 2],
											},
										],
									},
								],
							},
						],
					},
				},
			} as unknown as QueryRangeV5200,
			legendMap: { A: '{{service}}' },
		} as unknown as PanelQueryData;

		expect(
			resolveDistributionLegendSeries({
				spec: {} as DashboardtypesPanelSpecDTO,
				queries: [],
				data,
				isDarkMode: true,
			}),
		).toStrictEqual([
			{ label: 'cart', defaultColor: resolveSeriesColor('cart', true) },
		]);
	});
});
