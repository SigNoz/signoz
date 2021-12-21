import ROUTES from 'constants/routes';

type fiveMin = '5min';
type fifteenMin = '15min';
type thrityMin = '30min';
type oneMin = '1min';
type sixHour = '6hr';
type oneHour = '1hr';
type oneDay = '1day';
type oneWeek = '1week';
type custom = 'custom';

export type Time =
	| fiveMin
	| fifteenMin
	| thrityMin
	| oneMin
	| sixHour
	| oneHour
	| custom
	| oneWeek
	| oneDay;

export const Options: Option[] = [
	{ value: '5min', label: 'Last 5 min' },
	{ value: '15min', label: 'Last 15 min' },
	{ value: '30min', label: 'Last 30 min' },
	{ value: '1hr', label: 'Last 1 hour' },
	{ value: '6hr', label: 'Last 6 hour' },
	{ value: '1day', label: 'Last 1 day' },
	{ value: '1week', label: 'Last 1 week' },
	{ value: 'custom', label: 'Custom' },
];

export interface Option {
	value: Time;
	label: string;
}

export const ServiceMapOptions: Option[] = [
	{ value: '1min', label: 'Last 1 min' },
	{ value: '5min', label: 'Last 5 min' },
];

export const getDefaultOption = (route: string): Time => {
	if (route === ROUTES.SERVICE_MAP) {
		return ServiceMapOptions[0].value;
	}
	if (route === ROUTES.APPLICATION) {
		return Options[0].value;
	}
	return Options[2].value;
};

export const getOptions = (routes: string): Option[] => {
	if (routes === ROUTES.SERVICE_MAP) {
		return ServiceMapOptions;
	}
	return Options;
};
