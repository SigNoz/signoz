type TTimeUnitName = 'ms' | 's' | 'm' | 'hr' | 'day' | 'week';

export interface IIntervalUnit {
	name: TTimeUnitName;
	multiplier: number;
}

export const INTERVAL_UNITS: IIntervalUnit[] = [
	{
		name: 'ms',
		multiplier: 1,
	},
	{
		name: 's',
		multiplier: 1 / 1e3,
	},
	{
		name: 'm',
		multiplier: 1 / (1e3 * 60),
	},
	{
		name: 'hr',
		multiplier: 1 / (1e3 * 60 * 60),
	},
	{
		name: 'day',
		multiplier: 1 / (1e3 * 60 * 60 * 24),
	},
	{
		name: 'week',
		multiplier: 1 / (1e3 * 60 * 60 * 24 * 7),
	},
];

/** Picks the largest unit in which a millisecond duration is >= 1. */
export const convertTimeToRelevantUnit = (
	intervalTime: number,
): { time: number; timeUnitName: TTimeUnitName } => {
	let relevantTime = {
		time: intervalTime,
		timeUnitName: INTERVAL_UNITS[0].name,
	};

	for (let idx = INTERVAL_UNITS.length - 1; idx >= 0; idx -= 1) {
		const intervalUnit = INTERVAL_UNITS[idx];
		const convertedTimeForInterval = intervalTime * intervalUnit.multiplier;
		if (convertedTimeForInterval >= 1) {
			relevantTime = {
				time: convertedTimeForInterval,
				timeUnitName: intervalUnit.name,
			};
			break;
		}
	}
	return relevantTime;
};

/** Builds a `?a=1&b=2` query string, URI-encoding each value once. */
export const formUrlParams = (params: Record<string, any>): string => {
	let urlParams = '';
	Object.entries(params).forEach(([key, value], index) => {
		let encodedValue: string;
		try {
			encodedValue = decodeURIComponent(value);
			encodedValue = encodeURIComponent(encodedValue);
		} catch (error) {
			encodedValue = '';
		}
		if (index === 0) {
			if (encodedValue) {
				urlParams = `?${key}=${encodedValue}`;
			} else {
				urlParams = `?${key}=`;
			}
		} else if (encodedValue) {
			urlParams = `${urlParams}&${key}=${encodedValue}`;
		} else {
			urlParams = `${urlParams}&${key}=`;
		}
	});
	return urlParams;
};
