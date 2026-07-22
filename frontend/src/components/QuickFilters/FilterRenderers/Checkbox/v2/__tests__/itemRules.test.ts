import { deriveItemConfig, ItemContext, SectionType } from '../itemRules';

describe('itemRules', () => {
	describe('deriveItemConfig', () => {
		it('no query at all → section selected, no badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: false,
				hasFilterForThisKey: false,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.SELECTED);
			expect(result.badge).toBeNull();
		});

		it('selected + IN operator → section selected, no badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: true,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.SELECTED);
			expect(result.badge).toBeNull();
		});

		it('selected + NOT IN operator → section selected, no badge, unchecked', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: true,
				isInRelatedValues: false,
				isNotInOperator: true,
				hasExistingQuery: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.SELECTED);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('unchecked');
		});

		it('has query, not selected, in related → section related, checked', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: false,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.RELATED);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('checked');
		});

		it('has query, has filter for this key, in related → section related, checked', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.RELATED);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('checked');
		});

		it('has query, not in related → section all_values, unchecked', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: false,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: false,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.ALL_VALUES);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('unchecked');
		});

		it('has query + filter for key, not selected, not in related → section all_values, unchecked', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: false,
				isNotInOperator: false,
				hasExistingQuery: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.ALL_VALUES);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('unchecked');
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

			expect(result.section).toBe(SectionType.SELECTED);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('checked');
		});
	});
});
