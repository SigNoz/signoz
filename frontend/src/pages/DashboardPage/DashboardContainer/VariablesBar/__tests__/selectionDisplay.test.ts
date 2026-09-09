import { describeSelection } from '../utils/selectionDisplay';

describe('describeSelection', () => {
	it('reports an all-selected variable as ALL', () => {
		expect(describeSelection({ value: null, allSelected: true })).toStrictEqual({
			kind: 'all',
		});
	});

	it('lists a multi-select selection', () => {
		expect(
			describeSelection({ value: ['a', 'b'], allSelected: false }),
		).toStrictEqual({ kind: 'values', values: ['a', 'b'] });
	});

	it('keeps every value, however many there are', () => {
		const values = Array.from({ length: 30 }, (_, i) => `v${i}`);

		expect(
			describeSelection({ value: values, allSelected: false }),
		).toStrictEqual({ kind: 'values', values });
	});

	it('lists a single value on its own', () => {
		expect(
			describeSelection({ value: 'production', allSelected: false }),
		).toStrictEqual({ kind: 'values', values: ['production'] });
	});

	it('reports a missing or empty selection as empty', () => {
		expect(describeSelection(undefined)).toStrictEqual({ kind: 'empty' });
		expect(describeSelection({ value: '', allSelected: false })).toStrictEqual({
			kind: 'empty',
		});
		expect(describeSelection({ value: [], allSelected: false })).toStrictEqual({
			kind: 'empty',
		});
	});
});
