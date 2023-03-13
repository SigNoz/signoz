type ProcessorType = {
	key: string;
	value: string;
	label: string;
	title?: string;
	disabled?: boolean;
};

export const processorTypes: Array<ProcessorType> = [
	{ key: 'grok', value: 'grok', label: 'Grok' },
	{ key: 'regex', value: 'regex', label: 'Regex' },
	{ key: 'add', value: 'add', label: 'Add' },
	{ key: 'remove', value: 'remove', label: 'Remove' },
	{ key: 'trace_parser', value: 'trace_parser', label: 'Trace Parser' },
	{ key: 'retain', value: 'retain', label: 'Retain' },
	{ key: 'move', value: 'move', label: 'Move' },
	{ key: 'copy', value: 'copy', label: 'Copy' },
];

export const DEFAULT_PROCESSOR_TYPE = processorTypes[0].value;

export type ProcessorFormField = {
	id: number;
	fieldName: string;
	placeholder: string;
	name: string;
};

export const processorFields: { [key: string]: Array<ProcessorFormField> } = {
	grok: [
		{
			id: 1,
			fieldName: 'Name the Grok Processor',
			placeholder: 'processor_name_placeholder',
			name: 'name',
		},
		{
			id: 2,
			fieldName: 'Pattern',
			placeholder: 'processor_pattern_placeholder',
			name: 'pattern',
		},
		{
			id: 3,
			fieldName: 'Parse From',
			placeholder: 'processor_parsefrom_placeholder',
			name: 'parse_from',
		},
		{
			id: 4,
			fieldName: 'Parse To',
			placeholder: 'processor_parseto_placeholder',
			name: 'parse_to',
		},
		{
			id: 5,
			fieldName: 'On Error',
			placeholder: 'processor_onerror_placeholder',
			name: 'on_error',
		},
	],
	regex: [
		{
			id: 1,
			fieldName: 'Name the Regex Processor',
			placeholder: 'processor_name_placeholder',
			name: 'name',
		},
		{
			id: 2,
			fieldName: 'Define Regex',
			placeholder: 'processor_regex_placeholder',
			name: 'regex',
		},
		{
			id: 3,
			fieldName: 'Parse From',
			placeholder: 'processor_parsefrom_placeholder',
			name: 'parse_from',
		},
		{
			id: 4,
			fieldName: 'Parse To',
			placeholder: 'processor_parseto_placeholder',
			name: 'parse_to',
		},
		{
			id: 5,
			fieldName: 'On Error',
			placeholder: 'processor_onerror_placeholder',
			name: 'on_error',
		},
	],
	add: [
		{
			id: 1,
			fieldName: 'Name the Add Processor',
			placeholder: 'processor_name_placeholder',
			name: 'name',
		},
		{
			id: 2,
			fieldName: 'Field',
			placeholder: 'processor_field_placeholder',
			name: 'field',
		},
		{
			id: 3,
			fieldName: 'Value',
			placeholder: 'processor_value_placeholder',
			name: 'value',
		},
	],
	remove: [
		{
			id: 1,
			fieldName: 'Name the Remove Processor',
			placeholder: 'processor_name_placeholder',
			name: 'name',
		},
		{
			id: 2,
			fieldName: 'Field',
			placeholder: 'processor_field_placeholder',
			name: 'field',
		},
	],
	trace_parser: [
		{
			id: 1,
			fieldName: 'Name the Trace Parser Processor',
			placeholder: 'processor_name_placeholder',
			name: 'name',
		},
		{
			id: 2,
			fieldName: 'Trace Id Parce From',
			placeholder: 'processor_traceId_placeholder',
			name: 'traceId',
		},
		{
			id: 3,
			fieldName: 'Span id Parse From',
			placeholder: 'processor_spanId_placeholder',
			name: 'spanId',
		},
		{
			id: 4,
			fieldName: 'Trace flags parse from',
			placeholder: 'processor_traceFlags_placeholder',
			name: 'traceFlags',
		},
	],
	retain: [
		{
			id: 1,
			fieldName: 'Name the Retain Processor',
			placeholder: 'processor_name_placeholder',
			name: 'name',
		},
		{
			id: 2,
			fieldName: 'Fields',
			placeholder: 'processor_fields_placeholder',
			name: 'fields',
		},
	],
	move: [
		{
			id: 1,
			fieldName: 'Name the Move Processor',
			placeholder: 'processor_name_placeholder',
			name: 'name',
		},
		{
			id: 2,
			fieldName: 'From',
			placeholder: 'processor_from_placeholder',
			name: 'from',
		},
		{
			id: 3,
			fieldName: 'To',
			placeholder: 'processor_to_placeholder',
			name: 'to',
		},
	],
	copy: [
		{
			id: 1,
			fieldName: 'Name the Copy Processor',
			placeholder: 'processor_name_placeholder',
			name: 'name',
		},
		{
			id: 2,
			fieldName: 'From',
			placeholder: 'from',
			name: 'from',
		},
		{
			id: 3,
			fieldName: 'To',
			placeholder: 'to',
			name: 'to',
		},
	],
};
