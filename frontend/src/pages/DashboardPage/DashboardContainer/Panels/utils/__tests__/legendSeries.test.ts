import {
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDistributionPanelSpecDTOKind as DistributionKind,
	type DashboardtypesPanelSpecDTO,
	type Querybuildertypesv5DistributionDataDTO,
	Querybuildertypesv5RequestTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { resolveSeriesColor } from 'lib/visualization/charts/Distribution/colors';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { resolveDistributionLegendSeries } from '../legendSeries';

describe('resolveDistributionLegendSeries', () => {
	it('keys each group by the label and default colour the chart draws it with', () => {
		const result: Querybuildertypesv5DistributionDataDTO = {
			queryName: 'A',
			aggregations: [
				{
					alias: '__result_0',
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
		};
		const data: PanelQueryData = {
			response: {
				status: 'success',
				data: {
					type: Querybuildertypesv5RequestTypeDTO.distribution,
					data: { results: [result] },
				},
			},
			requestPayload: undefined,
			legendMap: { A: '{{service}}' },
		};
		const spec: DashboardtypesPanelSpecDTO = {
			display: { name: '' },
			plugin: { kind: DistributionKind['signoz/DistributionPanel'], spec: {} },
			queries: [],
		};

		expect(
			resolveDistributionLegendSeries({
				spec,
				queries: [],
				data,
				isDarkMode: true,
			}),
		).toStrictEqual([
			{ label: 'cart', defaultColor: resolveSeriesColor('cart', true) },
		]);
	});
});
