import { createFieldResetter, isDifferent } from '../changes';

describe('isDifferent', () => {
	it.each([
		[undefined, undefined],
		[false, undefined],
		[null, ''],
		[[], undefined],
		['solid', 'solid'],
		[{ fillOnlyBelow: false }, undefined],
		[{ unit: 'ms' }, { unit: 'ms', decimalPrecision: '' }],
	])('treats %p and saved %p as equal', (value, saved) => {
		expect(isDifferent(value, saved)).toBe(false);
	});

	it.each([
		['dashed', 'solid'],
		[true, undefined],
		[undefined, 'ms'],
		[[{ value: 1 }], undefined],
		[{ customColors: { a: '#fff' } }, {}],
		[{ lineStyle: 'solid' }, { lineStyle: 'solid', fillMode: 'none' }],
	])('treats %p and saved %p as different', (value, saved) => {
		expect(isDifferent(value, saved)).toBe(true);
	});
});

describe('createFieldResetter', () => {
	it('restores only the named fields to their saved values', () => {
		const onChange = jest.fn();
		const reset = createFieldResetter(
			{ softMin: 1, softMax: 9, isLogScale: true },
			{ softMin: 2, isLogScale: false },
			onChange,
		);

		const range = reset('softMin', 'softMax');
		expect(range.changed).toBe(true);
		range.onReset();

		expect(onChange).toHaveBeenCalledWith({
			softMin: 2,
			softMax: undefined,
			isLogScale: true,
		});
	});
});
