/* eslint-disable sonarjs/no-duplicate-string */
import ROUTES from 'constants/routes';

type FiveMin = '5m';
type TenMin = '10m';
type FifteenMin = '15m';
type ThirtyMin = '30m';
type FortyFiveMin = '45m';
type OneMin = '1m';
type ThreeHour = '3h';
type SixHour = '6h';
type OneHour = '1h';
type FourHour = '4h';
type TwelveHour = '12h';
type OneDay = '1d';
type ThreeDay = '3d';
type FourDay = '4d';
type TenDay = '10d';
type OneWeek = '1w';
type TwoWeek = '2w';
type SixWeek = '6w';
type OneMonth = '1month';
type TwoMonths = '2months';
type Custom = 'custom';

export type Time =
	| FiveMin
	| TenMin
	| FifteenMin
	| ThirtyMin
	| OneMin
	| ThreeHour
	| FourHour
	| SixHour
	| OneHour
	| Custom
	| OneWeek
	| SixWeek
	| OneDay
	| FourDay
	| ThreeDay
	| FortyFiveMin
	| TwelveHour
	| TenDay
	| TwoWeek
	| OneMonth
	| TwoMonths;

export type TimeUnit = 'm' | 'h' | 'd' | 'w';

export type CustomTimeType = `${string}${TimeUnit}`;

export const Options: Option[] = [
	{ value: '5m', label: 'Last 5 minutes' },
	{ value: '15m', label: 'Last 15 minutes' },
	{ value: '30m', label: 'Last 30 minutes' },
	{ value: '1h', label: 'Last 1 hour' },
	{ value: '6h', label: 'Last 6 hours' },
	{ value: '1d', label: 'Last 1 day' },
	{ value: '3d', label: 'Last 3 days' },
	{ value: '1w', label: 'Last 1 week' },
	{ value: '1month', label: 'Last 1 month' },
	{ value: 'custom', label: 'Custom' },
];

export interface Option {
	value: Time;
	label: string;
}

export const OLD_RELATIVE_TIME_VALUES = [
	'1min',
	'10min',
	'15min',
	'1hr',
	'30min',
	'45min',
	'5min',
	'1day',
	'3days',
	'4days',
	'10days',
	'1week',
	'2weeks',
	'6weeks',
	'3hr',
	'4hr',
	'6hr',
	'12hr',
];

export const RelativeDurationOptions: Option[] = [
	{ value: '5m', label: 'Last 5 minutes' },
	{ value: '15m', label: 'Last 15 minutes' },
	{ value: '30m', label: 'Last 30 minutes' },
	{ value: '1h', label: 'Last 1 hour' },
	{ value: '6h', label: 'Last 6 hour' },
	{ value: '1d', label: 'Last 1 day' },
	{ value: '3d', label: 'Last 3 days' },
	{ value: '1w', label: 'Last 1 week' },
	{ value: '1month', label: 'Last 1 month' },
];

export const RelativeDurationSuggestionOptions: Option[] = [
	{ value: '3h', label: 'Last 3 hours' },
	{ value: '4d', label: 'Last 4 days' },
	{ value: '6w', label: 'Last 6 weeks' },
	{ value: '12h', label: 'Last 12 hours' },
	{ value: '10d', label: 'Last 10 days' },
	{ value: '2w', label: 'Last 2 weeks' },
	{ value: '2months', label: 'Last 2 months' },
	{ value: '1d', label: 'today' },
];
export const FixedDurationSuggestionOptions: Option[] = [
	{ value: '45m', label: 'Last 45 mins' },
	{ value: '12h', label: 'Last 12 hours' },
	{ value: '10d', label: 'Last 10 days' },
	{ value: '2w', label: 'Last 2 weeks' },
	{ value: '2months', label: 'Last 2 months' },
	{ value: '1d', label: 'today' },
];

export const convertOldTimeToNewValidCustomTimeFormat = (
	time: string,
): CustomTimeType => {
	const regex = /^(\d+)([a-zA-Z]+)/;
	const match = regex.exec(time);

	if (match) {
		let unit = 'm';

		switch (match[2]) {
			case 'min':
				unit = 'm';
				break;
			case 'hr':
				unit = 'h';
				break;
			case 'day':
			case 'days':
				unit = 'd';
				break;
			case 'week':
			case 'weeks':
				unit = 'w';
				break;

			default:
				break;
		}

		return `${match[1]}${unit}` as CustomTimeType;
	}

	return '30m';
};

export const getDefaultOption = (route: string): Time => {
	if (route === ROUTES.SERVICE_MAP) {
		return RelativeDurationOptions[2].value;
	}
	if (route === ROUTES.APPLICATION) {
		return Options[2].value;
	}
	return Options[2].value;
};

export const getOptions = (routes: string): Option[] => {
	if (routes === ROUTES.SERVICE_MAP) {
		return RelativeDurationOptions;
	}
	return Options;
};

export const routesToHideBreadCrumbs = [ROUTES.SUPPORT, ROUTES.ALL_DASHBOARD];

export const routesToSkip = [
	ROUTES.SETTINGS,
	ROUTES.LIST_ALL_ALERT,
	ROUTES.TRACE_DETAIL,
	ROUTES.ALL_CHANNELS,
	ROUTES.USAGE_EXPLORER,
	ROUTES.GET_STARTED,
	ROUTES.GET_STARTED_APPLICATION_MONITORING,
	ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING,
	ROUTES.GET_STARTED_LOGS_MANAGEMENT,
	ROUTES.GET_STARTED_AWS_MONITORING,
	ROUTES.GET_STARTED_AZURE_MONITORING,
	ROUTES.VERSION,
	ROUTES.ALL_DASHBOARD,
	ROUTES.ORG_SETTINGS,
	ROUTES.INGESTION_SETTINGS,
	ROUTES.CUSTOM_DOMAIN_SETTINGS,
	ROUTES.API_KEYS,
	ROUTES.ERROR_DETAIL,
	ROUTES.LOGS_PIPELINES,
	ROUTES.BILLING,
	ROUTES.SUPPORT,
	ROUTES.WORKSPACE_LOCKED,
	ROUTES.WORKSPACE_SUSPENDED,
	ROUTES.LOGS,
	ROUTES.MY_SETTINGS,
	ROUTES.LIST_LICENSES,
	ROUTES.LOGS_SAVE_VIEWS,
	ROUTES.LOGS_PIPELINES,
	ROUTES.TRACES_EXPLORER,
	ROUTES.TRACES_SAVE_VIEWS,
	ROUTES.SHORTCUTS,
	ROUTES.INTEGRATIONS,
	ROUTES.DASHBOARD,
	ROUTES.DASHBOARD_WIDGET,
	ROUTES.SERVICE_TOP_LEVEL_OPERATIONS,
	ROUTES.ALERT_HISTORY,
	ROUTES.ALERT_OVERVIEW,
	ROUTES.MESSAGING_QUEUES_KAFKA,
	ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL,
	ROUTES.MESSAGING_QUEUES_CELERY_TASK,
	ROUTES.MESSAGING_QUEUES_OVERVIEW,
	ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
	ROUTES.SOMETHING_WENT_WRONG,
	ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES,
	ROUTES.METRICS_EXPLORER,
	ROUTES.METRICS_EXPLORER_EXPLORER,
	ROUTES.METRICS_EXPLORER_VIEWS,
];

export const routesToDisable = [ROUTES.LOGS_EXPLORER, ROUTES.LIVE_LOGS];

export interface LocalStorageTimeRange {
	localstorageStartTime: string | null;
	localstorageEndTime: string | null;
}

export interface TimeRange {
	startTime: string;
	endTime: string;
}

export enum LexicalContext {
	CUSTOM_DATE_PICKER = 'customDatePicker',
	CUSTOM_DATE_TIME_INPUT = 'customDateTimeInput',
}
