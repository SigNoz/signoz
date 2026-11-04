import { DashboardtypesDistributionXScaleDTO } from 'api/generated/services/sigNoz.schemas';
import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { getDistributionDataWarning } from '../warning';

function dataWith(buckets: number[], counts: number[][]): PanelQueryData {
	return {
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
									meta: { buckets },
									distributions: counts.map((entry) => ({ counts: entry })),
								},
							],
						},
					],
				},
			},
		} as unknown as QueryRangeV5200,
		legendMap: {},
	} as unknown as PanelQueryData;
}

function panelWith(
	spec: Record<string, unknown> = {},
): PanelOfKind<'signoz/DistributionPanel'> {
	return {
		spec: { plugin: { kind: 'signoz/DistributionPanel', spec } },
	} as unknown as PanelOfKind<'signoz/DistributionPanel'>;
}

describe('getDistributionDataWarning', () => {
	it('warns when more than 10% of observations overflow', () => {
		const warning = getDistributionDataWarning(
			panelWith({ formatting: { unit: 's' } }),
			dataWith([1, 10], [[10, 50, 40]]),
		);

		expect(warning?.message).toMatch(/^40% of observations are above 10/);
	});

	it('says nothing at or under 10%', () => {
		expect(
			getDistributionDataWarning(panelWith(), dataWith([1, 10], [[40, 50, 10]])),
		).toBeNull();
	});

	it('warns when an explicit log axis meets negative bounds', () => {
		const warning = getDistributionDataWarning(
			panelWith({
				axes: { x: { scale: DashboardtypesDistributionXScaleDTO.log } },
			}),
			dataWith([-5, 5], [[1, 1, 0]]),
		);

		expect(warning?.message).toMatch(/log axis can't place negative/);
	});

	it('lists both under one summary when both apply', () => {
		const warning = getDistributionDataWarning(
			panelWith({
				axes: { x: { scale: DashboardtypesDistributionXScaleDTO.log } },
			}),
			dataWith([-5, 5], [[1, 1, 8]]),
		);

		expect(warning?.messages).toHaveLength(2);
	});

	it('says nothing without bounds', () => {
		expect(getDistributionDataWarning(panelWith(), dataWith([], []))).toBeNull();
	});
});
