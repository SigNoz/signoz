export const processorTypes: Array<{ value: string; label: string }> = [
	{ value: 'Grok Processor', label: 'Grok Processor' },
	{ value: 'Remapper', label: 'Remapper' },
	{ value: 'User-Agent Parser', label: 'User-Agent Parser' },
	{ value: 'Status Remapper', label: 'Status Remapper' },
];

export const processorInputField = [
	{
		id: 1,
		fieldName: 'Name the Processor',
		placeholder: 'Name',
		name: 'name',
	},
	{
		id: 2,
		fieldName: 'Define Parsing Rules',
		placeholder: 'example rule: %{word:first}',
		name: 'description',
	},
];
