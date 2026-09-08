import {
	QueryBuilderField,
	QueryBuilderFieldRule,
	QueryBuilderFieldsConfig,
} from './queryBuilderFields.types';

export interface ResolvedQueryBuilderField {
	hidden: boolean;
	disabled: boolean;
	reason?: string;
	/** Rendered open, not dismissable, and kept out of the add-on toggle bar. */
	pinned: boolean;
}

const AVAILABLE: ResolvedQueryBuilderField = {
	hidden: false,
	disabled: false,
	pinned: false,
};

function fromRule(rule: QueryBuilderFieldRule): ResolvedQueryBuilderField {
	switch (rule.state) {
		case 'hidden':
			return { hidden: true, disabled: false, pinned: false };
		case 'disabled':
			return {
				hidden: false,
				disabled: true,
				reason: rule.reason,
				pinned: false,
			};
		case 'pinned':
			return { hidden: false, disabled: false, pinned: true };
		default:
			return AVAILABLE;
	}
}

export function resolveQueryBuilderField(
	field: QueryBuilderField,
	config?: QueryBuilderFieldsConfig,
): ResolvedQueryBuilderField {
	const rule = config?.[field];

	return rule ? fromRule(rule) : AVAILABLE;
}

/**
 * Fields absent from `supported` are hidden whatever the config says, so a config can
 * only ever take away.
 */
export function resolveQueryBuilderFields(
	supported: readonly QueryBuilderField[],
	config?: QueryBuilderFieldsConfig,
): Map<QueryBuilderField, ResolvedQueryBuilderField> {
	return new Map(
		supported.map((field) => [field, resolveQueryBuilderField(field, config)]),
	);
}

/**
 * The surface a raw-row builder starts from, layered under a caller's own config.
 * `AdditionalQueries` is deliberately absent — a raw trace builder still takes several
 * queries when trace matching is on.
 */
export const RAW_QUERY_FIELDS: QueryBuilderFieldsConfig = {
	[QueryBuilderField.Aggregation]: { state: 'hidden' },
	[QueryBuilderField.StepInterval]: { state: 'hidden' },
	[QueryBuilderField.Functions]: { state: 'hidden' },
	[QueryBuilderField.GroupBy]: { state: 'hidden' },
	[QueryBuilderField.Having]: { state: 'hidden' },
	[QueryBuilderField.Limit]: { state: 'hidden' },
	[QueryBuilderField.Legend]: { state: 'hidden' },
	[QueryBuilderField.ReduceTo]: { state: 'hidden' },
	[QueryBuilderField.Formula]: { state: 'hidden' },
	[QueryBuilderField.OrderBy]: { state: 'pinned' },
};

export function mergeQueryBuilderFieldsConfig(
	baseline: QueryBuilderFieldsConfig | undefined,
	override: QueryBuilderFieldsConfig | undefined,
): QueryBuilderFieldsConfig | undefined {
	if (!baseline) {
		return override;
	}

	return override ? { ...baseline, ...override } : baseline;
}
