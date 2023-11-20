import { themeColors } from 'constants/theme';
import { Span } from 'types/api/trace/getTraceItem';

import spans from './__fixtures__/getRandomColor';
import { colors, spanServiceNameToColorMapping } from './getRandomColor';

describe('spanServiceNameToColorMapping', () => {
	test('should map span services to colors', () => {
		const expectedServiceToColorMap = {
			serviceA: themeColors.chartcolors.turquoise,
			serviceB: themeColors.chartcolors.turquoise,
			serviceC: colors[2], // 2 is because we have already used 0 and 1 in the above services,
		};

		const result = spanServiceNameToColorMapping(spans);

		expect(result).toEqual(expectedServiceToColorMap);
	});

	test('should return an empty object when input is an empty array', () => {
		const spans: Span[] = [];

		const expectedServiceToColorMap = {};

		const result = spanServiceNameToColorMapping(spans);

		expect(result).toEqual(expectedServiceToColorMap);
	});
});
