import type { QueryBuilderField } from '../../queryBuilderFields.types';

/** Fields the add-on bar does not own: each has its own control elsewhere in the query. */
export type NonAddOnField =
	| QueryBuilderField.Aggregation
	| QueryBuilderField.StepInterval
	| QueryBuilderField.Functions
	| QueryBuilderField.Formula
	| QueryBuilderField.AdditionalQueries
	| QueryBuilderField.TraceOperator;

export type AddOnField = Exclude<QueryBuilderField, NonAddOnField>;

export interface AddOnSpec {
	icon: React.ReactNode;
	label: string;
	/** Where the add-on's value lives on the query; a value there opens it on mount. */
	queryPath: string;
	description?: string;
	docLink?: string;
}

/** A text field has to name what leaving it empty means. */
export type AddOnDefinition =
	| (AddOnSpec & { input: true; placeholder: string })
	| (AddOnSpec & { input: false });

export type AddOn = AddOnDefinition & { key: AddOnField };
