import { CSSProperties } from 'react';

import { ViewModeOption } from './types';

export const viewModeOptionList: ViewModeOption[] = [
	{
		key: 'raw',
		label: 'Raw',
		value: 'raw',
	},
	{
		key: 'table',
		label: 'Table',
		value: 'table',
	},
	{
		key: 'list',
		label: 'List',
		value: 'list',
	},
];

export const logsOptions = ['raw', 'table'];

export const defaultSelectStyle: CSSProperties = {
	minWidth: '6rem',
};
