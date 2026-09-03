export const VariableQueryTypeArr = [
	'QUERY',
	'TEXTBOX',
	'CUSTOM',
	'DYNAMIC',
] as const;
export type TVariableQueryType = (typeof VariableQueryTypeArr)[number];

export const VariableSortTypeArr = ['DISABLED', 'ASC', 'DESC'] as const;
export type TSortVariableValuesType = (typeof VariableSortTypeArr)[number];

export interface IDashboardVariable {
	id: string;
	/** Display position. Nothing sets it now that the v2 API orders variables by array position. */
	order?: number;
	name?: string; // key will be the source of truth
	description: string;
	type: TVariableQueryType;
	// Query
	queryValue?: string;
	// Custom
	customValue?: string;
	// Textbox
	textboxValue?: string;

	sort: TSortVariableValuesType;
	multiSelect: boolean;
	showALLOption: boolean;
	selectedValue?:
		| null
		| string
		| number
		| boolean
		| (string | number | boolean)[];
	allSelected?: boolean;
	dynamicVariablesAttribute?: string;
	dynamicVariablesSource?: string;
}
