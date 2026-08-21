import { PANEL_TYPES } from 'constants/queryBuilder';

export const DEFAULT_PANEL_TYPE = PANEL_TYPES.TRACE;

export const TOOLBAR_VIEWS = {
	list: {
		name: 'list',
		label: 'List',
		show: true,
		key: 'list',
	},
	timeseries: {
		name: 'timeseries',
		label: 'Timeseries',
		disabled: false,
		show: true,
		key: 'timeseries',
	},
	trace: {
		name: 'trace',
		label: 'Trace',
		disabled: false,
		show: true,
		key: 'trace',
	},
	table: {
		name: 'table',
		label: 'Table',
		disabled: false,
		show: true,
		key: 'table',
	},
	clickhouse: {
		name: 'clickhouse',
		label: 'Clickhouse',
		disabled: false,
		show: false,
		key: 'clickhouse',
	},
};
