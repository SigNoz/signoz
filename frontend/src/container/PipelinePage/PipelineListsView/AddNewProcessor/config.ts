const flexDirectionCss: React.CSSProperties['flexDirection'] = 'row';

export const wrapperStyle = {
	display: 'flex',
	flexDirection: flexDirectionCss,
	alignItems: 'flex-start',
	padding: '0rem',
	gap: '1rem',
	width: '100%',
};

type ProcessorType = {
	key: string;
	value: string;
	label: string;
	title?: string;
	disabled?: boolean;
};

export const processorTypes: Array<ProcessorType> = [
	{ key: 'grokusecommon', value: 'grok', label: 'grok use common' },
	{ key: 'renameauth', value: 'move', label: 'rename auth' },
	{
		key: 'parsetracedetails',
		value: 'trace_parser',
		label: 'Parse trace details',
	},
	{ key: 'removeoldxspan_id', value: 'remove', label: 'remove old xtrace_id' },
];

export const DEFAULT_PROCESSOR_TYPE = processorTypes[0].value;

export const processorInputField = [
	{
		id: '1',
		fieldName: 'Name the Processor',
		placeholder: 'processor_name_placeholder',
		name: 'processorName',
	},
	{
		id: '2',
		fieldName: 'Define Parsing Rules',
		placeholder: 'processor_description_placeholder',
		name: 'description',
	},
];
