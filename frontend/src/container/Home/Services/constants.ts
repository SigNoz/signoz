import { TableProps } from 'antd';
import { ServicesList } from 'types/api/metrics/getService';

export const columns: TableProps<ServicesList>['columns'] = [
	{
		title: 'APPLICATION',
		dataIndex: 'serviceName',
		key: 'serviceName',
	},
	{
		title: 'P99 LATENCY (in ms)',
		dataIndex: 'p99',
		key: 'p99',
		render: (value: number): string => (value / 1000000).toFixed(2),
	},
	{
		title: 'ERROR RATE (% of total)',
		dataIndex: 'errorRate',
		key: 'errorRate',

		render: (value: number): string => value.toFixed(2),
	},
	{
		title: 'OPS / SEC',
		dataIndex: 'callRate',
		key: 'callRate',
		render: (value: number): string => value.toFixed(2),
	},
];

export enum TimeIntervalsEnum {
	LAST_5_MINUTES = 60 * 5 * 1000, // 300000
	LAST_15_MINUTES = 60 * 15 * 1000, // 900000
	LAST_30_MINUTES = 60 * 30 * 1000, // 1800000
	LAST_1_HOUR = 60 * 60 * 1000, // 3600000
	LAST_6_HOURS = 60 * 60 * 6 * 1000, // 21600000
	LAST_1_DAY = 60 * 60 * 24 * 1000, // 86400000
	LAST_3_DAYS = 60 * 60 * 24 * 3 * 1000, // 259200000
	LAST_7_DAYS = 60 * 60 * 24 * 7 * 1000, // 604800000
	LAST_30_DAYS = 60 * 60 * 24 * 30 * 1000, // 2592000000
}

export const TIME_PICKER_OPTIONS = [
	{
		value: TimeIntervalsEnum.LAST_5_MINUTES,
		label: 'Last 5 minutes',
	},
	{
		value: TimeIntervalsEnum.LAST_15_MINUTES,
		label: 'Last 15 minutes',
	},
	{
		value: TimeIntervalsEnum.LAST_30_MINUTES,
		label: 'Last 30 minutes',
	},
	{
		value: TimeIntervalsEnum.LAST_1_HOUR,
		label: 'Last 1 hour',
	},
	{
		value: TimeIntervalsEnum.LAST_6_HOURS,
		label: 'Last 6 hours',
	},
	{
		value: TimeIntervalsEnum.LAST_1_DAY,
		label: 'Last 1 day',
	},
	{
		value: TimeIntervalsEnum.LAST_3_DAYS,
		label: 'Last 3 days',
	},
	{
		value: TimeIntervalsEnum.LAST_7_DAYS,
		label: 'Last 1 week',
	},
	{
		value: TimeIntervalsEnum.LAST_30_DAYS,
		label: 'Last 1 month',
	},
];
