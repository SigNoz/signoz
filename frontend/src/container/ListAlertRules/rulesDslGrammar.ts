import type { DslGrammar } from 'components/ListFilter/dsl/types';

// Mirrors pkg/types/ruletypes/list_filter.go. Label keys go under `labels.`.
export const RULES_DSL_GRAMMAR: DslGrammar = {
	reservedKeys: [
		'name',
		'severity',
		'alert_type',
		'rule_type',
		'created_by',
		'updated_by',
		'created_at',
		'updated_at',
	],
	fieldTypes: {
		name: 'string',
		// Aliases labels.severity, so it takes the label operators.
		severity: 'dynamic',
		created_by: 'string',
		updated_by: 'string',
		created_at: 'timestamp',
		updated_at: 'timestamp',
		alert_type: 'enum',
		rule_type: 'enum',
	},
	dynamicKey: { detail: 'label', prefix: 'labels.' },
	enumValues: {
		alert_type: [
			'METRIC_BASED_ALERT',
			'LOGS_BASED_ALERT',
			'TRACES_BASED_ALERT',
			'EXCEPTIONS_BASED_ALERT',
			'AI_TRACES_BASED_ALERT',
		],
		rule_type: ['threshold_rule', 'promql_rule', 'anomaly_rule'],
	},
	hiddenKeys: ['labels.<key>'],
};
