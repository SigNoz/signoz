import { sortByMeanDesc } from '../sortByMeanDesc';

interface Item {
	name: string;
	values: (number | null)[];
}

const item = (name: string, values: (number | null)[]): Item => ({
	name,
	values,
});

const sorted = (items: Item[]): string[] =>
	sortByMeanDesc(items, {
		getValues: (entry) => entry.values,
		getKey: (entry) => entry.name,
	}).map((entry) => entry.name);

describe('sortByMeanDesc', () => {
	it('orders items by descending mean', () => {
		expect(
			sorted([item('a', [1, 1]), item('b', [10, 20]), item('c', [5, 5])]),
		).toStrictEqual(['b', 'c', 'a']);
	});

	it('sinks items with no finite values to the bottom', () => {
		expect(
			sorted([item('a', []), item('b', [NaN, Infinity]), item('c', [1])]),
		).toStrictEqual(['c', 'a', 'b']);
	});

	it('ignores non-finite and null values when averaging', () => {
		// Mean over the finite values only is 10, so NaN must not poison it to last place.
		expect(
			sorted([item('a', [2, 2]), item('b', [10, NaN]), item('c', [4, null])]),
		).toStrictEqual(['b', 'c', 'a']);
	});

	it('produces the same order whichever order the items arrive in', () => {
		const a = item('a', [5]);
		const b = item('b', [5]);
		const c = item('c', [9]);

		expect(sorted([a, b, c])).toStrictEqual(sorted([c, b, a]));
		expect(sorted([b, a, c])).toStrictEqual(['c', 'a', 'b']);
	});

	it('tiebreaks equal means on the key', () => {
		expect(sorted([item('b', [1]), item('a', [1])])).toStrictEqual(['a', 'b']);
	});

	it('tiebreaks on the key for items that have no finite values either', () => {
		expect(sorted([item('b', []), item('a', [NaN])])).toStrictEqual(['a', 'b']);
	});

	it('does not mutate the input array', () => {
		const items = [item('a', [1]), item('b', [9])];

		expect(sorted(items)).toStrictEqual(['b', 'a']);
		expect(items.map((entry) => entry.name)).toStrictEqual(['a', 'b']);
	});

	it('returns an empty array for no items', () => {
		expect(sorted([])).toStrictEqual([]);
	});
});
