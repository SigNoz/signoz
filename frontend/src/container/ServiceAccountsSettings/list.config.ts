import type {
	ClauseBuilder,
	DslGrammar,
} from 'components/ListFilter/dsl/types';
import { clause } from 'components/ListFilter/dsl/filterQuery';

export const SERVICE_ACCOUNTS_DSL_GRAMMAR = {
	fields: [
		{ key: 'name', type: 'string' },
		{ key: 'email', type: 'string' },
		{ key: 'status', type: 'enum', values: ['active', 'deleted'] },
		{ key: 'created_at', type: 'timestamp' },
		{ key: 'updated_at', type: 'timestamp' },
	],
	dynamicKey: { detail: 'field', prefix: '' },
} as const satisfies DslGrammar;

export const where: ClauseBuilder<
	(typeof SERVICE_ACCOUNTS_DSL_GRAMMAR)['fields'][number]['key']
> = clause;

// The list opens on the live accounts; the clause sits in the box so it can be edited away.
export const SERVICE_ACCOUNTS_DEFAULT_QUERY = where('status', '=', 'active');
