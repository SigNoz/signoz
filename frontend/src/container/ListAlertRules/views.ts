import { RuletypesAlertStateDTO } from 'api/generated/services/sigNoz.schemas';
import { BellOff, Flame, Layers, User } from '@signozhq/icons';
import { createdByClause } from 'components/ListFilter/dsl/filterQuery';
import type { BuiltinListView } from 'components/ListViews/types';

import type { RuleListFilter } from './types';

export const RuleBuiltinViewId = {
	Mine: 'mine',
	All: 'all',
	Firing: 'firing',
	Disabled: 'disabled',
} as const;

export const RULE_BUILTIN_VIEWS: BuiltinListView[] = [
	{
		id: RuleBuiltinViewId.Mine,
		label: 'My alert rules',
		icon: User,
		section: 'personal',
	},
	{
		id: RuleBuiltinViewId.All,
		label: 'All alert rules',
		icon: Layers,
		section: 'system',
	},
	{
		id: RuleBuiltinViewId.Firing,
		label: 'Firing',
		icon: Flame,
		section: 'system',
	},
	{
		id: RuleBuiltinViewId.Disabled,
		label: 'Disabled',
		icon: BellOff,
		section: 'system',
	},
];

// Built-in views replace query and states; the current sort/order is kept.
export const builtinRuleViewFilter = (
	id: string,
	current: RuleListFilter,
	userEmail: string,
): RuleListFilter | null => {
	switch (id) {
		case RuleBuiltinViewId.Mine:
			return {
				...current,
				query: userEmail ? (createdByClause([userEmail]) ?? '') : '',
				states: [],
			};
		case RuleBuiltinViewId.All:
			return { ...current, query: '', states: [] };
		case RuleBuiltinViewId.Firing:
			return { ...current, query: '', states: [RuletypesAlertStateDTO.firing] };
		case RuleBuiltinViewId.Disabled:
			return {
				...current,
				query: '',
				states: [RuletypesAlertStateDTO.disabled],
			};
		default:
			return null;
	}
};
