import type {
	Querybuildertypesv5DistributionDataDTO,
	Querybuildertypesv5DistributionDTO,
} from 'api/generated/services/sigNoz.schemas';

import { prepareDistributionData } from '../prepareData';

function result({
	queryName = 'A',
	buckets = [1, 2, 4],
	distributions = [],
}: {
	queryName?: string;
	buckets?: number[];
	distributions?: Querybuildertypesv5DistributionDTO[];
} = {}): Querybuildertypesv5DistributionDataDTO {
	return {
		queryName,
		aggregations: [{ index: 0, meta: { buckets }, distributions }],
	};
}

describe('prepareDistributionData', () => {
	it('reads the bucket bounds and one count array per group', () => {
		const { buckets, series, queryName } = prepareDistributionData({
			results: [
				result({
					distributions: [
						{
							labels: [{ key: { name: 'service' }, value: 'redis' }],
							counts: [5, 12, 3, 1],
						},
						{
							labels: [{ key: { name: 'service' }, value: 'cart' }],
							counts: [0, 4, 8, 0],
						},
					],
				}),
			],
			legendMap: {},
		});

		expect(buckets).toStrictEqual([1, 2, 4]);
		expect(queryName).toBe('A');
		expect(series).toStrictEqual([
			{
				label: '{service="redis"}',
				groupLabels: { service: 'redis' },
				counts: [5, 12, 3, 1],
			},
			{
				label: '{service="cart"}',
				groupLabels: { service: 'cart' },
				counts: [0, 4, 8, 0],
			},
		]);
	});

	it('names an ungrouped distribution after its query', () => {
		const { series } = prepareDistributionData({
			results: [result({ distributions: [{ counts: [1, 0, 0, 0] }] })],
			legendMap: { A: '' },
		});

		expect(series).toHaveLength(1);
		expect(series[0].label).toBe('A');
	});

	it('applies the query legend as the group label template', () => {
		const { series } = prepareDistributionData({
			results: [
				result({
					distributions: [
						{
							labels: [{ key: { name: 'service' }, value: 'redis' }],
							counts: [1, 0, 0, 0],
						},
					],
				}),
			],
			legendMap: { A: '{{service}} latency' },
		});

		expect(series[0].label).toBe('redis latency');
	});

	it('pads missing counts with zero and trims extras, keeping the overflow slot', () => {
		const { series } = prepareDistributionData({
			results: [
				result({
					distributions: [
						{ counts: [1, 2] },
						{ counts: [1, 2, 3, 4, 5] },
						{ counts: null },
					],
				}),
			],
			legendMap: {},
		});

		expect(series.map(({ counts }) => counts)).toStrictEqual([
			[1, 2, 0, 0],
			[1, 2, 3, 4],
			[0, 0, 0, 0],
		]);
	});

	it('skips aggregations without bounds and reads the first that has them', () => {
		const { buckets } = prepareDistributionData({
			results: [
				{
					queryName: 'A',
					aggregations: [
						{ index: 0, meta: {}, distributions: [{ counts: [1] }] },
						{ index: 1, meta: { buckets: [10, 20] }, distributions: [] },
					],
				},
			],
			legendMap: {},
		});

		expect(buckets).toStrictEqual([10, 20]);
	});

	it('returns no buckets when nothing carries bounds', () => {
		expect(
			prepareDistributionData({
				results: [result({ buckets: [] })],
				legendMap: {},
			}),
		).toStrictEqual({ buckets: [], series: [], queryName: '' });
		expect(prepareDistributionData({ results: [], legendMap: {} })).toStrictEqual(
			{
				buckets: [],
				series: [],
				queryName: '',
			},
		);
	});
});
