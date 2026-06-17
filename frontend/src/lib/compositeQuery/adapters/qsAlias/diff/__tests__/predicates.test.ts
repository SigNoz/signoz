import { isContainer, isEmptyContainer, isLeaf } from '../predicates';

const noop = (): void => undefined;

describe('qsAlias/diff predicates', () => {
	describe('isContainer', () => {
		it('is true for plain objects and arrays', () => {
			expect(isContainer({})).toBe(true);
			expect(isContainer({ a: 1 })).toBe(true);
			expect(isContainer([])).toBe(true);
			expect(isContainer([1, 2])).toBe(true);
		});

		it('is false for null and undefined', () => {
			expect(isContainer(null)).toBe(false);
			expect(isContainer(undefined)).toBe(false);
		});

		it('is false for scalars', () => {
			expect(isContainer('')).toBe(false);
			expect(isContainer('str')).toBe(false);
			expect(isContainer(0)).toBe(false);
			expect(isContainer(42)).toBe(false);
			expect(isContainer(NaN)).toBe(false);
			expect(isContainer(true)).toBe(false);
			expect(isContainer(false)).toBe(false);
		});

		it('is false for functions and symbols', () => {
			expect(isContainer(noop)).toBe(false);
			expect(isContainer(Symbol('x'))).toBe(false);
		});

		it('is true for exotic objects like Date (typeof object)', () => {
			expect(isContainer(new Date(0))).toBe(true);
		});
	});

	describe('isEmptyContainer', () => {
		it('is true only for [] and {}', () => {
			expect(isEmptyContainer([])).toBe(true);
			expect(isEmptyContainer({})).toBe(true);
		});

		it('is false for non-empty containers', () => {
			expect(isEmptyContainer([1])).toBe(false);
			expect(isEmptyContainer({ a: 1 })).toBe(false);
		});

		it('is false for scalars, null and undefined', () => {
			expect(isEmptyContainer(null)).toBe(false);
			expect(isEmptyContainer(undefined)).toBe(false);
			expect(isEmptyContainer('')).toBe(false);
			expect(isEmptyContainer(0)).toBe(false);
		});

		it('treats objects with only non-enumerable keys (Date) as empty', () => {
			// Date has no own *enumerable* keys, so Object.keys() is empty.
			expect(isEmptyContainer(new Date(0))).toBe(true);
		});
	});

	describe('isLeaf', () => {
		it('is true for every scalar', () => {
			['', 'str', 0, 1, -1, 3.14, true, false].forEach((value) => {
				expect(isLeaf(value)).toBe(true);
			});
		});

		it('is true for null and undefined', () => {
			expect(isLeaf(null)).toBe(true);
			expect(isLeaf(undefined)).toBe(true);
		});

		it('is true for empty containers', () => {
			expect(isLeaf([])).toBe(true);
			expect(isLeaf({})).toBe(true);
		});

		it('is false for non-empty containers', () => {
			expect(isLeaf([1])).toBe(false);
			expect(isLeaf({ a: 1 })).toBe(false);
		});

		it('counts a key whose value is undefined as non-empty (not a leaf)', () => {
			expect(isLeaf({ a: undefined })).toBe(false);
		});
	});
});
