import type {
	DashboardtypesTopListPanelSpecDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { getTopListCsvRows } from '../csv';

const panelWith = (
	spec: DashboardtypesTopListPanelSpecDTO,
): PanelOfKind<'signoz/TopListPanel'> =>
	({
		spec: { plugin: { kind: 'signoz/TopListPanel', spec } },
	}) as unknown as PanelOfKind<'signoz/TopListPanel'>;

function dataWith(groupColumns: string[], rows: unknown[][]): PanelQueryData {
	return {
		response: {
			status: 'success',
			data: {
				type: 'scalar',
				data: {
					results: [
						{
							queryName: 'A',
							columns: [
								...groupColumns.map((name) => ({
									name,
									queryName: 'A',
									columnType: 'group',
								})),
								{
									name: '__result',
									queryName: 'A',
									columnType: 'aggregation',
									aggregationIndex: 0,
								},
							],
							data: rows,
						},
					],
				},
			},
		} as unknown as QueryRangeV5200,
		requestPayload: undefined,
		legendMap: {},
	};
}

describe('getTopListCsvRows', () => {
	it('exports the ranked rows with formatted values', () => {
		const data = dataWith(
			['service.name'],
			[
				['auth', 25],
				['payment', 1500],
			],
		);

		expect(
			getTopListCsvRows(panelWith({ formatting: { unit: 'ms' } }), data),
		).toStrictEqual([
			{ Rank: '1', 'service.name': 'payment', A: '1.5 s' },
			{ Rank: '2', 'service.name': 'auth', A: '25 ms' },
		]);
	});

	it('names the label column after every group-by key', () => {
		const data = dataWith(['http.route', 'region'], [['GET /orders', 'eu', 3]]);

		expect(Object.keys(getTopListCsvRows(panelWith({}), data)[0])).toStrictEqual([
			'Rank',
			'http.route · region',
			'A',
		]);
	});

	it('falls back to a generic label header without a group-by', () => {
		const data = dataWith([], [[42]]);

		expect(getTopListCsvRows(panelWith({}), data)).toStrictEqual([
			{ Rank: '1', Label: 'A', A: '42' },
		]);
	});

	it('exports nothing for an empty result', () => {
		expect(getTopListCsvRows(panelWith({}), dataWith([], []))).toStrictEqual([]);
	});
});
