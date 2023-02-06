export const items: Array<{ value: string; label: string }> = [
	{ value: 'Grok Processor', label: 'Grok Processor' },
	{ value: 'Remapper', label: 'Remapper' },
	{ value: 'User-Agent Parser', label: 'User-Agent Parser' },
	{ value: 'Status Remapper', label: 'Status Remapper' },
];

export const grokProcessorInputFild = [
	{
		id: 1,
		fildName: 'Name the Processor',
		placeholder: 'Name',
	},
	{
		id: 2,
		fildName: 'Define Parsing Rules',
		placeholder: 'example rule: %{word:first}',
	},
];
