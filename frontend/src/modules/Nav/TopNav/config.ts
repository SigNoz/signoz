import ROUTES from 'Src/constants/routes';

export const Options = [
	{ value: '5min', label: 'Last 5 min' },
	{ value: '15min', label: 'Last 15 min' },
	{ value: '30min', label: 'Last 30 min' },
	{ value: '1hr', label: 'Last 1 hour' },
	{ value: '6hr', label: 'Last 6 hour' },
	{ value: '1day', label: 'Last 1 day' },
	{ value: '1week', label: 'Last 1 week' },
	{ value: 'custom', label: 'Custom' },
];

export const ServiceMapOptions = [
	{ value: '1min', label: 'Last 1 min' },
	{ value: '5min', label: 'Last 5 min' },
];

export const DefaultOptionsBasedOnRoute = {
	[ROUTES.SERVICE_MAP]: ServiceMapOptions[0].value,
	[ROUTES.APPLICATION]: Options[0].value,
	[ROUTES.SERVICE_METRICS]: Options[2].value,
	default: Options[2].value,
};
