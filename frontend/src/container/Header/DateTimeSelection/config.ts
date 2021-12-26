import ROUTES from 'constants/routes';
import dayjs from 'dayjs';

type oneMin = '1min';
type fiveMin = '5min';
type fifteenMin = '15min';
type thrityMin = '30min';
type oneHour = '1hr';
type sixHour = '6hr';
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

// end time should be greater than the start Time
export const getTimeBasedOnStartAndEndTime = (
	startTime: number,
	endTime: number,
	preSelectedTime: Time,
): Time => {
	const startDayJs = dayjs(startTime);
	const endDayJs = dayjs(endTime);

	const current = dayjs();

	console.log(endDayJs, startDayJs, 'asd');

	// endTime > startTime so we need to compare with current and endDayjs
	if (endDayJs.isBefore(startDayJs)) {
		const minutesDiff = current.diff(endDayJs, 'minute');
		const hourDiff = current.diff(endDayJs, 'hour');
		const dayDiff = current.diff(endDayJs, 'day');
		const weekDiff = current.diff(endDayJs, 'week');

		console.log(minutesDiff, hourDiff, dayDiff, weekDiff);

		if (weekDiff > 0) {
			return '1week';
		}

		if (dayDiff > 0) {
			return '1day';
		}

		if (hourDiff >= 6) {
			return '6hr';
		}

		if (hourDiff >= 1) {
			return '1hr';
		}

		if (minutesDiff >= 30) {
			return '30min';
		}

		if (minutesDiff >= 5) {
			return '5min';
		}

		return '1min';
	} else {
		// not a valid case as of now return the pre selected time
		return preSelectedTime;
	}
};
