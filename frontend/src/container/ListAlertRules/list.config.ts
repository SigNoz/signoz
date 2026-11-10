import { RuletypesAlertStateDTO } from 'api/generated/services/sigNoz.schemas';
import { BellOff, Flame, Layers, User } from '@signozhq/icons';
import { clause } from 'components/ListFilter/dsl/filterQuery';
import type {
	ClauseBuilder,
	DslGrammar,
} from 'components/ListFilter/dsl/types';
import type { BuiltinViewConfig } from 'components/ListViews/types';

import type { RuleListFilter, RuleViewCtx } from './types';

// Mirrors pkg/types/ruletypes/list_filter.go. Label keys go under `labels.`.
export const RULES_DSL_GRAMMAR = {
	fields: [
		{ key: 'name', type: 'string' },
		// Aliases labels.severity, so it takes the label operators.
		{ key: 'severity', type: 'dynamic' },
		{
			key: 'alert_type',
			type: 'enum',
			values: [
				'METRIC_BASED_ALERT',
				'LOGS_BASED_ALERT',
				'TRACES_BASED_ALERT',
				'EXCEPTIONS_BASED_ALERT',
				'AI_TRACES_BASED_ALERT',
			],
		},
		{
			key: 'rule_type',
			type: 'enum',
			values: ['threshold_rule', 'promql_rule', 'anomaly_rule'],
		},
		{ key: 'created_by', type: 'string' },
		{ key: 'updated_by', type: 'string' },
		{ key: 'created_at', type: 'timestamp' },
		{ key: 'updated_at', type: 'timestamp' },
	],
	dynamicKey: { detail: 'label', prefix: 'labels.' },
	hiddenKeys: ['labels.<key>'],
} as const satisfies DslGrammar;

const where: ClauseBuilder<
	(typeof RULES_DSL_GRAMMAR)['fields'][number]['key']
> = clause;

type RuleViewConfig = BuiltinViewConfig<RuleListFilter, RuleViewCtx>;

// Built-in views replace query and states; the current sort/order is kept.
const views = [
	{
		id: 'mine',
		label: 'My alert rules',
		icon: User,
		section: 'personal',
		filter: (current, { userEmail }): RuleListFilter => ({
			...current,
			query: userEmail ? where('created_by', '=', userEmail) : '',
			states: [],
		}),
	},
	{
		id: 'all',
		label: 'All alert rules',
		icon: Layers,
		section: 'system',
		filter: (current): RuleListFilter => ({ ...current, query: '', states: [] }),
	},
	{
		id: 'firing',
		label: 'Firing',
		icon: Flame,
		section: 'system',
		filter: (current): RuleListFilter => ({
			...current,
			query: '',
			states: [RuletypesAlertStateDTO.firing],
		}),
	},
	{
		id: 'disabled',
		label: 'Disabled',
		icon: BellOff,
		section: 'system',
		filter: (current): RuleListFilter => ({
			...current,
			query: '',
			states: [RuletypesAlertStateDTO.disabled],
		}),
	},
] as const satisfies readonly RuleViewConfig[];

export type RuleViewId = (typeof views)[number]['id'];

export const RULE_BUILTIN_VIEWS: readonly RuleViewConfig[] = views;

export const DEFAULT_RULE_VIEW: RuleViewId = 'all';
