import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

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
