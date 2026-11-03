import { DEFAULT_SCATTER_POINT_SIZE } from 'lib/uPlotV2/plugins/ScatterPlugin/types';

import {
	DEFAULT_POINT_OPACITY,
	resolvePointOpacity,
	resolvePointSize,
} from '../points';

describe('scatter plot points', () => {
	it('draws unset points at the defaults', () => {
		expect(resolvePointSize(undefined)).toStrictEqual(DEFAULT_SCATTER_POINT_SIZE);
		expect(resolvePointOpacity(undefined)).toBe(DEFAULT_POINT_OPACITY);
	});

	it('takes each set field and defaults the rest, null included', () => {
		expect(
			resolvePointSize({ size: 10, minSize: null, maxSize: 30 }),
		).toStrictEqual({ fixed: 10, min: DEFAULT_SCATTER_POINT_SIZE.min, max: 30 });
		expect(resolvePointOpacity({ opacity: 0.1 })).toBe(0.1);
	});
});
