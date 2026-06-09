import { Color } from '@signozhq/design-tokens';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { prepareBillingBarConfig } from '../prepareBillingBarConfig';

const makeApiResponse = (legends: string[]): MetricRangePayloadProps => ({
	data: {
		result: legends.map((legend) => ({
			legend,
			queryName: legend,
			metric: {},
			values: [[1000, '10']],
		})),
		resultType: '',
		newResult: { data: { result: [], resultType: '' } },
	},
});

describe('prepareBillingBarConfig', () => {
	const baseProps = { isDarkMode: false };

	it('returns a builder with no series when apiResponse is undefined', () => {
		const builder = prepareBillingBarConfig(baseProps);
		const config = builder.getConfig();
		expect(config.series).toHaveLength(1);
	});

	it('returns a builder with no series when result is empty', () => {
		const builder = prepareBillingBarConfig({
			...baseProps,
			apiResponse: makeApiResponse([]),
		});
		const config = builder.getConfig();
		expect(config.series).toHaveLength(1);
	});

	it('adds one series per result entry with correct labels and colors', () => {
		const builder = prepareBillingBarConfig({
			...baseProps,
			apiResponse: makeApiResponse(['Logs', 'Traces', 'Metrics']),
		});
		const config = builder.getConfig();
		expect(config.series).toHaveLength(4);
		expect(config.series?.[1]?.label).toBe('Logs');
		expect(config.series?.[1]?.stroke).toBe(Color.BG_FOREST_300);
		expect(config.series?.[2]?.label).toBe('Traces');
		expect(config.series?.[2]?.stroke).toBe(Color.BG_ROBIN_500);
		expect(config.series?.[3]?.label).toBe('Metrics');
		expect(config.series?.[3]?.stroke).toBe(Color.BG_SAKURA_500);
	});

	it('assigns fallback color (Amber500) for signals beyond the 3-color palette', () => {
		const builder = prepareBillingBarConfig({
			...baseProps,
			apiResponse: makeApiResponse(['A', 'B', 'C', 'D']),
		});
		const config = builder.getConfig();
		expect(config.series?.[4]?.stroke).toBe(Color.BG_AMBER_500);
	});

	it('sets stacking bands, padding, and focus alpha for behavioral parity', () => {
		const builder = prepareBillingBarConfig({
			...baseProps,
			apiResponse: makeApiResponse(['Logs', 'Traces', 'Metrics']),
		});
		const config = builder.getConfig();
		expect(config.bands).toStrictEqual([{ series: [1, 2] }, { series: [2, 3] }]);
		expect(config.padding).toStrictEqual([32, 32, 16, 16]);
		expect(config.focus).toStrictEqual({ alpha: 0.3 });
	});

	it('sets no bands when result is empty', () => {
		const builder = prepareBillingBarConfig({
			...baseProps,
			apiResponse: makeApiResponse([]),
		});
		const config = builder.getConfig();
		expect(config.bands).toBeUndefined();
	});

	it('uses queryName as label when legend is undefined', () => {
		const apiResponse: MetricRangePayloadProps = {
			data: {
				result: [
					{
						legend: undefined as any,
						queryName: 'Logs',
						metric: {},
						values: [[1000, '10']],
					},
				],
				resultType: '',
				newResult: { data: { result: [], resultType: '' } },
			},
		};
		const builder = prepareBillingBarConfig({ isDarkMode: false, apiResponse });
		const config = builder.getConfig();
		expect(config.series?.[1]?.label).toBe('Logs');
		expect(config.series?.[1]?.stroke).toBe(Color.BG_FOREST_300);
	});
});
