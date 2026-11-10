import { pickScaleOptions } from '../options';

describe('pickScaleOptions', () => {
	it('returns the tiles for the given scales, in that order', () => {
		expect(
			pickScaleOptions(['symlog', 'linear'] as const).map(({ value, label }) => ({
				value,
				label,
			})),
		).toStrictEqual([
			{ value: 'symlog', label: 'Symlog' },
			{ value: 'linear', label: 'Linear' },
		]);
	});
});
