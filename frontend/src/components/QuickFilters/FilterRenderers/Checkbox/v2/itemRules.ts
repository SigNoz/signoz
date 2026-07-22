import { CheckedState } from '../../../types';

export enum SectionType {
	SELECTED = 'selected',
	RELATED = 'related',
	ALL_VALUES = 'all_values',
}

export interface BadgeConfig {
	key: string;
	label: string;
	color: 'robin' | 'warning' | 'secondary';
}

export interface ItemConfig {
	section: SectionType;
	badge: BadgeConfig | null;
	checkedState: CheckedState;
}

export interface ItemContext {
	isSelectedOnFilter: boolean;
	isInRelatedValues: boolean;
	isNotInOperator: boolean;
	hasExistingQuery: boolean;
	hasFilterForThisKey: boolean;
}

export interface DerivedItem extends ItemConfig {
	value: string;
}

interface ItemRule {
	condition: (ctx: ItemContext) => boolean;
	config: ItemConfig;
}

const ITEM_RULES: ItemRule[] = [
	// No existing query and no filter → all checked (selected section)
	{
		condition: (ctx): boolean =>
			!ctx.hasExistingQuery && !ctx.hasFilterForThisKey,
		config: {
			section: SectionType.SELECTED,
			badge: null,
			checkedState: 'checked',
		},
	},
	// Selected with NOT IN operator → unchecked, no badge
	{
		condition: (ctx): boolean => ctx.isSelectedOnFilter && ctx.isNotInOperator,
		config: {
			section: SectionType.SELECTED,
			badge: null,
			checkedState: 'unchecked',
		},
	},
	// Selected with IN operator → checked
	{
		condition: (ctx): boolean => ctx.isSelectedOnFilter && !ctx.isNotInOperator,
		config: {
			section: SectionType.SELECTED,
			badge: null,
			checkedState: 'checked',
		},
	},
	// Related values (from existing query) → checked
	{
		condition: (ctx): boolean => ctx.hasExistingQuery && ctx.isInRelatedValues,
		config: {
			section: SectionType.RELATED,
			badge: null,
			checkedState: 'checked',
		},
	},
	// All values (has existing query but not related) → unchecked
	{
		condition: (ctx): boolean => ctx.hasExistingQuery,
		config: {
			section: SectionType.ALL_VALUES,
			badge: null,
			checkedState: 'unchecked',
		},
	},
];

// Fallback when no rule matches
const DEFAULT_CONFIG: ItemConfig = {
	section: SectionType.SELECTED,
	badge: null,
	checkedState: 'checked',
};

export function deriveItemConfig(ctx: ItemContext): ItemConfig {
	for (const rule of ITEM_RULES) {
		if (rule.condition(ctx)) {
			return rule.config;
		}
	}
	return DEFAULT_CONFIG;
}

export function deriveItems(
	values: string[],
	relatedSet: Set<string>,
	selectedOnFilterSet: Set<string>,
	ctx: Omit<ItemContext, 'isSelectedOnFilter' | 'isInRelatedValues'>,
): DerivedItem[] {
	return values.map((value) => {
		const itemCtx: ItemContext = {
			...ctx,
			isSelectedOnFilter: selectedOnFilterSet.has(value),
			isInRelatedValues: relatedSet.has(value),
		};
		const config = deriveItemConfig(itemCtx);
		return { value, ...config };
	});
}
