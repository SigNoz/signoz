import { PANEL_TYPES } from 'constants/queryBuilder';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

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

//TODO: Change this later
export const defaultSelectedColumns: string[] = [
	'service.name',
	'name',
	'duration_nano',
	'http_method',
	'response_status_code',
	'timestamp',
];

export const PER_PAGE_OPTIONS: number[] = DEFAULT_PER_PAGE_OPTIONS;

/** The trace list's default order, which the keys endpoint does not report. */
export const TRACE_VIEW_STATIC_ORDER_BY_KEYS: string[] = ['last_activity_time'];

export const TRACE_VIEW_DEFAULT_ORDER_BY = 'last_activity_time:desc';
