import {
	DashboardtypesPanelKindDTO,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDistributionPanelSpecDTOKind as DistributionKind,
	type DashboardtypesDistributionPanelSpecDTO,
	type Querybuildertypesv5DistributionDataDTO,
	Querybuildertypesv5RequestTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { getDistributionDataWarning } from '../warning';

function dataWith(buckets: number[], counts: number[][]): PanelQueryData {
	const result: Querybuildertypesv5DistributionDataDTO = {
		queryName: 'A',
		aggregations: [
			{
				alias: '__result_0',
				index: 0,
				meta: { buckets },
				distributions: counts.map((entry) => ({ counts: entry })),
			},
		],
	};
	return {
		response: {
			status: 'success',
			data: {
				type: Querybuildertypesv5RequestTypeDTO.distribution,
				data: { results: [result] },
			},
		},
		requestPayload: undefined,
		legendMap: {},
	};
}

function panelWith(
	spec: Partial<DashboardtypesDistributionPanelSpecDTO> = {},
): PanelOfKind<'signoz/DistributionPanel'> {
	return {
		kind: DashboardtypesPanelKindDTO.Panel,
		spec: {
			display: { name: '' },
			plugin: { kind: DistributionKind['signoz/DistributionPanel'], spec },
			queries: [],
		},
	};
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

	it('says nothing without bounds', () => {
		expect(getDistributionDataWarning(panelWith(), dataWith([], []))).toBeNull();
	});
});
