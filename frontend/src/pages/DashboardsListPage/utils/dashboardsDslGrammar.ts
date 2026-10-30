import type { DslGrammar } from 'components/ListFilter/dsl/types';

// Mirrors pkg/types/dashboardtypes/list_filter.go. Any other key is a tag key.
// (`updated_by` and `source` are NOT queryable.)
export const DASHBOARDS_DSL_GRAMMAR: DslGrammar = {
	reservedKeys: [
		'name',
		'description',
		'created_by',
		'created_at',
		'updated_at',
		'locked',
	],
	fieldTypes: {
		name: 'string',
		description: 'string',
		created_by: 'string',
		created_at: 'timestamp',
		updated_at: 'timestamp',
		locked: 'bool',
	},
	dynamicKey: { detail: 'tag', prefix: '' },
};
