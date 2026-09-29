import { createFieldResetter, isChanged } from '../changes';

describe('isChanged', () => {
	it.each([
		[undefined, undefined],
		[false, undefined],
		[null, undefined],
		['', undefined],
		[[], undefined],
		['solid', 'solid'],
		[{ fillOnlyBelow: false }, undefined],
		[{ lineStyle: 'solid' }, { lineStyle: 'solid', fillMode: 'none' }],
	])('treats %p over default %p as unchanged', (value, defaultValue) => {
		expect(isChanged(value, defaultValue)).toBe(false);
	});

	it.each([
		['dashed', 'solid'],
		[true, undefined],
		[[{ value: 1 }], undefined],
		[{ customColors: { a: '#fff' } }, {}],
		[{ lineStyle: 'dashed' }, { lineStyle: 'solid' }],
	])('treats %p over default %p as changed', (value, defaultValue) => {
		expect(isChanged(value, defaultValue)).toBe(true);
	});
});

describe('createFieldResetter', () => {
	it('restores only the named fields to their defaults', () => {
		const onChange = jest.fn();
		const reset = createFieldResetter(
			{ softMin: 1, softMax: 9, isLogScale: true },
			{ isLogScale: false },
			onChange,
		);

		const range = reset('softMin', 'softMax');
		expect(range.changed).toBe(true);
		range.onReset();

		expect(onChange).toHaveBeenCalledWith({
			softMin: undefined,
			softMax: undefined,
			isLogScale: true,
		});
	});
});
