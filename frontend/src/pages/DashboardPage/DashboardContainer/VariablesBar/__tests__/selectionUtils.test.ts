import type { VariableSelection } from '../selectionTypes';
import { selectionFromCommittedValues } from '../utils/selectionUtils';

const OPTIONS = ['checkout', 'payments', 'cart'];
const FALLBACK: VariableSelection = { value: null, allSelected: true };

function commit(
	values: string[],
	overrides: Partial<Parameters<typeof selectionFromCommittedValues>[0]> = {},
): VariableSelection {
	return selectionFromCommittedValues({
		values,
		options: OPTIONS,
		showAllOption: true,
		emptyFallback: FALLBACK,
		...overrides,
	});
}

// What a multi-select commit resolves to. The option list is known only here, so this
// is the one place a typed value can be recognised.
describe('selectionFromCommittedValues', () => {
	it('marks values the option list did not offer as typed in', () => {
		expect(commit(['checkout', 'typed-in'])).toStrictEqual({
			value: ['checkout', 'typed-in'],
			allSelected: false,
			customValues: ['typed-in'],
		});
	});

	it('marks a selection made only of typed-in values', () => {
		expect(commit(['a', 'b'])).toStrictEqual({
			value: ['a', 'b'],
			allSelected: false,
			customValues: ['a', 'b'],
		});
	});

	it('records no marker when every pick came from the list', () => {
		expect(commit(['checkout', 'cart'])).toStrictEqual({
			value: ['checkout', 'cart'],
			allSelected: false,
		});
	});

	it('reads a set covering every option as ALL', () => {
		expect(commit(OPTIONS)).toStrictEqual({
			value: OPTIONS,
			allSelected: true,
		});
	});

	// ALL re-materializes to the option set, so recording this as ALL would drop the
	// typed value on the next refetch.
	it('does not read every option PLUS a typed value as ALL', () => {
		expect(commit([...OPTIONS, 'typed-in'])).toStrictEqual({
			value: [...OPTIONS, 'typed-in'],
			allSelected: false,
			customValues: ['typed-in'],
		});
	});

	// Derived from the values + options at commit time, never from the old selection.
	it('recomputes the marker: a typed value the data now offers is a normal pick', () => {
		expect(
			commit(['checkout', 'was-typed'], {
				options: [...OPTIONS, 'was-typed'],
			}),
		).toStrictEqual({ value: ['checkout', 'was-typed'], allSelected: false });
	});

	it('does not read it as ALL when the variable offers no ALL', () => {
		expect(commit(OPTIONS, { showAllOption: false })).toStrictEqual({
			value: OPTIONS,
			allSelected: false,
		});
	});

	it('resolves an empty commit to the variable fallback', () => {
		expect(commit([])).toBe(FALLBACK);
	});

	it('marks everything while the options have not arrived', () => {
		// Nothing to judge against yet; erring this way keeps a value rather than dropping it.
		expect(commit(['typed-in'], { options: [] })).toStrictEqual({
			value: ['typed-in'],
			allSelected: false,
			customValues: ['typed-in'],
		});
	});
});
