interface SpanKindList {
	label: 'SERVER' | 'CLIENT';
	value: string;
}

export const spanKindList: SpanKindList[] = [
	{
		label: 'SERVER',
		value: '2',
	},
	{
		label: 'CLIENT',
		value: '3',
	},
];
