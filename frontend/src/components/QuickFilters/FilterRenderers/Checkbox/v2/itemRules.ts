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
	isRelatedValuesSupported: boolean;
}

export interface DerivedItem extends ItemConfig {
	value: string;
}

interface ItemRule {
	condition: (ctx: ItemContext) => boolean;
	config: ItemConfig;
}

const RELATED_SUPPORTED_RULES: ItemRule[] = [
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
	// filterKey present in query with NOT IN and value not in the list → checked
	{
		condition: (ctx): boolean =>
			ctx.hasFilterForThisKey && ctx.isNotInOperator && !ctx.isSelectedOnFilter,
		config: {
			section: SectionType.ALL_VALUES,
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

const RELATED_UNSUPPORTED_RULES: ItemRule[] = [
	// No filter on this key → included by default
	{
		condition: (ctx): boolean => !ctx.hasFilterForThisKey,
		config: {
			section: SectionType.SELECTED,
			badge: null,
			checkedState: 'checked',
		},
	},
	// Explicitly excluded by NOT IN
	{
		condition: (ctx): boolean => ctx.isSelectedOnFilter && ctx.isNotInOperator,
		config: {
			section: SectionType.SELECTED,
			badge: null,
			checkedState: 'unchecked',
		},
	},
	// Explicitly selected by IN
	{
		condition: (ctx): boolean => ctx.isSelectedOnFilter && !ctx.isNotInOperator,
		config: {
			section: SectionType.SELECTED,
			badge: null,
			checkedState: 'checked',
		},
	},
	// Not listed in the key's NOT IN clause → not excluded, still in results
	{
		condition: (ctx): boolean => ctx.isNotInOperator,
		config: {
			section: SectionType.ALL_VALUES,
			badge: null,
			checkedState: 'checked',
		},
	},
	// Not listed in the key's IN clause → filtered out of results
	{
		condition: (): boolean => true,
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
	const rules = ctx.isRelatedValuesSupported
		? RELATED_SUPPORTED_RULES
		: RELATED_UNSUPPORTED_RULES;
	for (const rule of rules) {
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
