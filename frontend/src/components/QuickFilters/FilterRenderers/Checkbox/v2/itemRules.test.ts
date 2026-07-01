import { deriveItemConfig, ItemContext } from './itemRules';

describe('itemRules', () => {
	describe('deriveItemConfig', () => {
		it('no query at all → orderIndex 0, no badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: false,
				hasFilterForThisKey: false,
			};

			const result = deriveItemConfig(ctx);

			expect(result.orderIndex).toBe(0);
			expect(result.badge).toBeNull();
		});

		it('selected + IN operator → orderIndex 0, no badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: true,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.orderIndex).toBe(0);
			expect(result.badge).toBeNull();
		});

		it('selected + NOT IN operator → orderIndex 0, not_in badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: true,
				isInRelatedValues: false,
				isNotInOperator: true,
				hasExistingQuery: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.orderIndex).toBe(0);
			expect(result.badge).toStrictEqual({
				key: 'not_in',
				label: 'Not in',
				color: 'warning',
			});
		});

		it('has query, no filter for this key, in related → orderIndex 1, related badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: false,
			};

			const result = deriveItemConfig(ctx);

			expect(result.orderIndex).toBe(1);
			expect(result.badge).toStrictEqual({
				key: 'related',
				label: 'Related',
				color: 'robin',
			});
		});

		it('has query, has filter for this key, in related → orderIndex 1, related badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.orderIndex).toBe(1);
			expect(result.badge).toStrictEqual({
				key: 'related',
				label: 'Related',
				color: 'robin',
			});
		});

		it('has query, not in related → orderIndex 2, no badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: false,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: false,
			};

			const result = deriveItemConfig(ctx);

			expect(result.orderIndex).toBe(2);
			expect(result.badge).toBeNull();
		});

		it('has query + filter for key, not selected, not in related → orderIndex 2, no badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: false,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.orderIndex).toBe(2);
			expect(result.badge).toBeNull();
		});

		it('no query but has filter for key, not selected → fallback to checked (DEFAULT_CONFIG)', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: false,
				isNotInOperator: false,
				hasExistingQuery: false,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.orderIndex).toBe(0);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('checked');
		});
	});
});
