import { MetricRangePayloadV3 } from 'types/api/metrics/getQueryRange';

import { convertNewDataToOld } from '../convertNewDataToOld';

describe('convertNewDataToOld', () => {
	it('carries partial values as epoch-second partialTimestamps', () => {
		const payload = {
			data: {
				resultType: 'time_series',
				result: [
					{
						queryName: 'A',
						series: [
							{
								labels: {},
								labelsArray: [],
								values: [
									{ timestamp: 1_000_000, value: '1' },
									{ timestamp: 1_060_000, value: '0.2', partial: true },
								],
							},
							{
								labels: {},
								labelsArray: [],
								values: [{ timestamp: 1_000_000, value: '1' }],
							},
						],
					},
				],
			},
		} as unknown as MetricRangePayloadV3;

		const [partial, complete] = convertNewDataToOld(payload).data.result;

		expect(partial.values).toStrictEqual([
			[1000, '1'],
			[1060, '0.2'],
		]);
		expect(partial.partialTimestamps).toStrictEqual([1060]);
		expect(complete).not.toHaveProperty('partialTimestamps');
	});
});
