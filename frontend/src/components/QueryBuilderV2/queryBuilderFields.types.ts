/**
 * Everything the query builder can surface.
 *
 * The per-query values double as the add-on identities the builder renders
 * (`data-testid="query-add-on-<value>"`), so they are part of the DOM contract and must
 * not be renamed to match the member names.
 */
export enum QueryBuilderField {
	// Per query
	Aggregation = 'aggregation',
	StepInterval = 'step_interval',
	Functions = 'functions',
	GroupBy = 'group_by',
	Having = 'having',
	OrderBy = 'order_by',
	Limit = 'limit',
	Legend = 'legend_format',
	ReduceTo = 'reduce_to',
	// Builder level
	Formula = 'formula',
	AdditionalQueries = 'additional_queries',
}

/** `reason` is required on `disabled`: an inert control the user can see has to explain itself. */
export type QueryBuilderFieldRule =
	| { state: 'hidden' }
	| { state: 'disabled'; reason: string }
	| { state: 'pinned' };

/**
 * A caller's narrowing of the builder's surface. The builder works out which fields suit
 * the current data source and panel type first; this can only take away from that set.
 */
export type QueryBuilderFieldsConfig = Partial<
	Record<QueryBuilderField, QueryBuilderFieldRule>
>;
