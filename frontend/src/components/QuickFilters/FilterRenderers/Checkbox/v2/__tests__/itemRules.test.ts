import { deriveItemConfig, ItemContext, SectionType } from '../itemRules';

describe('itemRules', () => {
	describe('deriveItemConfig', () => {
		it('no query at all → section selected, no badge', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: false,
				isRelatedValuesSupported: true,
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
				isRelatedValuesSupported: true,
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
				isRelatedValuesSupported: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.SELECTED);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('unchecked');
		});

		it('NOT IN filter, value not excluded, not related → all_values, unchecked', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: false,
				isNotInOperator: true,
				hasExistingQuery: true,
				isRelatedValuesSupported: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.ALL_VALUES);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('unchecked');
		});

		it('NOT IN filter, value not excluded but related → related wins, checked', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: true,
				isNotInOperator: true,
				hasExistingQuery: true,
				isRelatedValuesSupported: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.RELATED);
			expect(result.checkedState).toBe('checked');
		});

		it('has query, not selected, in related → section related, checked', () => {
			const ctx: ItemContext = {
				isSelectedOnFilter: false,
				isInRelatedValues: true,
				isNotInOperator: false,
				hasExistingQuery: true,
				isRelatedValuesSupported: true,
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
				isRelatedValuesSupported: true,
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
				isRelatedValuesSupported: true,
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
				isRelatedValuesSupported: true,
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
				isRelatedValuesSupported: true,
				hasFilterForThisKey: true,
			};

			const result = deriveItemConfig(ctx);

			expect(result.section).toBe(SectionType.SELECTED);
			expect(result.badge).toBeNull();
			expect(result.checkedState).toBe('checked');
		});
	});

	describe('deriveItemConfig with related values unsupported', () => {
		const baseCtx: Omit<ItemContext, 'isSelectedOnFilter' | 'isNotInOperator'> = {
			isInRelatedValues: false,
			hasExistingQuery: true,
			hasFilterForThisKey: true,
			isRelatedValuesSupported: false,
		};

		it('no filter on this key → selected, checked, even with an existing query', () => {
			const result = deriveItemConfig({
				...baseCtx,
				hasFilterForThisKey: false,
				isSelectedOnFilter: false,
				isNotInOperator: false,
			});

			expect(result.section).toBe(SectionType.SELECTED);
			expect(result.checkedState).toBe('checked');
		});

		it('excluded by NOT IN → selected, unchecked', () => {
			const result = deriveItemConfig({
				...baseCtx,
				isSelectedOnFilter: true,
				isNotInOperator: true,
			});

			expect(result.section).toBe(SectionType.SELECTED);
			expect(result.checkedState).toBe('unchecked');
		});

		it('selected by IN → selected, checked', () => {
			const result = deriveItemConfig({
				...baseCtx,
				isSelectedOnFilter: true,
				isNotInOperator: false,
			});

			expect(result.section).toBe(SectionType.SELECTED);
			expect(result.checkedState).toBe('checked');
		});

		it('NOT IN complement → all_values, checked, related values ignored', () => {
			const result = deriveItemConfig({
				...baseCtx,
				isSelectedOnFilter: false,
				isNotInOperator: true,
			});

			expect(result.section).toBe(SectionType.ALL_VALUES);
			expect(result.checkedState).toBe('checked');
		});

		it('IN complement → all_values, unchecked, never related', () => {
			const result = deriveItemConfig({
				...baseCtx,
				isInRelatedValues: true,
				isSelectedOnFilter: false,
				isNotInOperator: false,
			});

			expect(result.section).toBe(SectionType.ALL_VALUES);
			expect(result.checkedState).toBe('unchecked');
		});
	});
});
