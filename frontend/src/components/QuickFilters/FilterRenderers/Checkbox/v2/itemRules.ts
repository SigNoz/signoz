import { CheckedState } from '../../../types';

export interface BadgeConfig {
	key: string;
	label: string;
	color: 'robin' | 'warning' | 'secondary';
}

export interface ItemConfig {
	orderIndex: number;
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
	{
		condition: (ctx): boolean =>
			!ctx.hasExistingQuery && !ctx.hasFilterForThisKey,
		config: { orderIndex: 0, badge: null, checkedState: 'checked' },
	},
	{
		condition: (ctx): boolean => ctx.isSelectedOnFilter && ctx.isNotInOperator,
		config: {
			orderIndex: 0,
			badge: { key: 'not_in', label: 'Not in', color: 'warning' },
			checkedState: 'unchecked',
		},
	},
	{
		condition: (ctx): boolean => ctx.isSelectedOnFilter && !ctx.isNotInOperator,
		config: { orderIndex: 0, badge: null, checkedState: 'checked' },
	},
	{
		condition: (ctx): boolean =>
			ctx.hasExistingQuery && !ctx.hasFilterForThisKey && ctx.isInRelatedValues,
		config: {
			orderIndex: 1,
			badge: { key: 'related', label: 'Related', color: 'robin' },
			checkedState: 'indeterminate',
		},
	},
	{
		condition: (ctx): boolean =>
			ctx.hasExistingQuery && ctx.hasFilterForThisKey && ctx.isInRelatedValues,
		config: {
			orderIndex: 1,
			badge: { key: 'related', label: 'Related', color: 'robin' },
			checkedState: 'indeterminate',
		},
	},
	{
		condition: (ctx): boolean => ctx.hasExistingQuery,
		config: {
			orderIndex: 2,
			badge: null,
			checkedState: 'unchecked',
		},
	},
];

// Fallback when no rule matches
const DEFAULT_CONFIG: ItemConfig = {
	orderIndex: 0,
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
