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

export enum OrderPreferenceItems {
	DESC = 'desc',
	ASC = 'asc',
}

export const orderItems: OrderPreference[] = [
	{
		name: 'Descending',
		enum: OrderPreferenceItems.DESC,
	},
	{
		name: 'Ascending',
		enum: OrderPreferenceItems.ASC,
	},
];

export interface OrderPreference {
	name: string;
	enum: OrderPreferenceItems;
}
