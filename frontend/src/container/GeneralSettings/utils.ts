export type SettingPeriod = 'hr' | 'day' | 'month';

export interface ITimeUnit {
	value: SettingPeriod;
	key: string;
	multiplier: number;
}

export enum TimeUnitsValues {
	hr = 'hr',
	day = 'day',
	month = 'month',
}

export const TimeUnits: ITimeUnit[] = [
	{
		value: TimeUnitsValues.hr,
		key: 'Hours',
		multiplier: 1,
	},
	{
		value: TimeUnitsValues.day,
		key: 'Days',
		multiplier: 1 / 24,
	},
	{
		value: TimeUnitsValues.month,
		key: 'Months',
		multiplier: 1 / (24 * 30),
	},
];

interface ITimeUnitConversion {
	value: number;
	timeUnitValue: SettingPeriod;
}

/**
 * Converts hours value to the most relevant unit from the available units.
 * @param value - The value in hours
 * @param availableUnits - Optional array of available time units to consider. If not provided, all units are considered.
 * @returns The converted value and the selected time unit
 */
export const convertHoursValueToRelevantUnit = (
	value: number,
	availableUnits?: ITimeUnit[],
): ITimeUnitConversion => {
	const unitsToConsider = availableUnits?.length ? availableUnits : TimeUnits;
	if (value >= 0) {
		for (let idx = unitsToConsider.length - 1; idx >= 0; idx -= 1) {
			const timeUnit = unitsToConsider[idx];
			const convertedValue = timeUnit.multiplier * value;

			if (
				convertedValue >= 1 &&
				convertedValue === parseInt(`${convertedValue}`, 10)
			) {
				return { value: convertedValue, timeUnitValue: timeUnit.value };
			}
		}
	}

	// Fallback to the first available unit
	return { value: -1, timeUnitValue: unitsToConsider[0].value };
};

export const convertHoursValueToRelevantUnitString = (
	value: number,
): string => {
	if (!value) return '';
	const convertedTimeUnit = convertHoursValueToRelevantUnit(value);
	return `${convertedTimeUnit.value} ${convertedTimeUnit.timeUnitValue}${
		convertedTimeUnit.value >= 2 ? 's' : ''
	}`;
};
