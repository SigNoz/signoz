/* eslint-disable sonarjs/no-duplicate-string */
import ROUTES from 'constants/routes';

type FiveMin = '5min';
type TenMin = '10min';
type FifteenMin = '15min';
type ThirtyMin = '30min';
type FortyFiveMin = '45min';
type OneMin = '1min';
type ThreeHour = '3hr';
type SixHour = '6hr';
type OneHour = '1hr';
type FourHour = '4hr';
type TwelveHour = '12hr';
type OneDay = '1day';
type ThreeDay = '3days';
type FourDay = '4days';
type TenDay = '10days';
type OneWeek = '1week';
type TwoWeek = '2weeks';
type SixWeek = '6weeks';
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
	| TwoMonths;

export const Options: Option[] = [
	{ value: '5min', label: 'Last 5 minutes' },
	{ value: '15min', label: 'Last 15 minutes' },
	{ value: '30min', label: 'Last 30 minutes' },
	{ value: '1hr', label: 'Last 1 hour' },
	{ value: '6hr', label: 'Last 6 hours' },
	{ value: '1day', label: 'Last 1 day' },
	{ value: '3days', label: 'Last 3 days' },
	{ value: '1week', label: 'Last 1 week' },
	{ value: 'custom', label: 'Custom...' },
];

export interface Option {
	value: Time;
	label: string;
}

export const RelativeDurationOptions: Option[] = [
	{ value: '5min', label: 'Last 5 minutes' },
	{ value: '15min', label: 'Last 15 minutes' },
	{ value: '30min', label: 'Last 30 minutes' },
	{ value: '1hr', label: 'Last 1 hour' },
	{ value: '6hr', label: 'Last 6 hour' },
	{ value: '1day', label: 'Last 1 day' },
	{ value: '3days', label: 'Last 3 days' },
	{ value: '1week', label: 'Last 1 week' },
];

export const RelativeDurationSuggestionOptions: Option[] = [
	{ value: '3hr', label: '3h' },
	{ value: '4days', label: '4d' },
	{ value: '6weeks', label: '6w' },
	{ value: '12hr', label: '12 hours' },
	{ value: '10days', label: '10d' },
	{ value: '2weeks', label: '2 weeks' },
	{ value: '2months', label: 'Last 2 months' },
	{ value: '1day', label: 'today' },
];
export const FixedDurationSuggestionOptions: Option[] = [
	{ value: '45min', label: '45m' },
	{ value: '12hr', label: '12 hours' },
	{ value: '10days', label: '10d' },
	{ value: '2weeks', label: '2 weeks' },
	{ value: '2months', label: 'Last 2 months' },
	{ value: '1day', label: 'today' },
];

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
	ROUTES.VERSION,
	ROUTES.ALL_DASHBOARD,
	ROUTES.ORG_SETTINGS,
	ROUTES.INGESTION_SETTINGS,
	ROUTES.ERROR_DETAIL,
	ROUTES.LOGS_PIPELINES,
	ROUTES.BILLING,
	ROUTES.SUPPORT,
	ROUTES.WORKSPACE_LOCKED,
	ROUTES.LOGS,
	ROUTES.MY_SETTINGS,
	ROUTES.LIST_LICENSES,
	ROUTES.SAVE_VIEWS,
	ROUTES.LOGS_PIPELINES,
	ROUTES.TRACES_EXPLORER,
];

export const routesToDisable = [ROUTES.LOGS_EXPLORER, ROUTES.LIVE_LOGS];
