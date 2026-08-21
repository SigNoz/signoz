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
	order?: any;
	name?: string; // key will be the source of truth
	description: string;
	type: TVariableQueryType;
	// Query
	queryValue?: string;
	// Custom
	customValue?: string;
	// Textbox
	// special case of variable where defaultValue is same as this. Otherwise, defaultValue is a single field
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
	// Internal use
	modificationUUID?: string;
	allSelected?: boolean;
	change?: boolean;
	defaultValue?: string;
	dynamicVariablesAttribute?: string;
	dynamicVariablesSource?: string;
	haveCustomValuesSelected?: boolean;
}
