export type SettingPeriod = 'hr' | 'day' | 'month';

export interface ITimeUnit {
	value: SettingPeriod;
	key: string;
	multiplier: number;
}
export const TimeUnits: ITimeUnit[] = [
	{
		value: 'hr',
		key: 'Hours',
		multiplier: 1,
	},
	{
		value: 'day',
		key: 'Days',
		multiplier: 1 / 24,
	},
	{
		value: 'month',
		key: 'Months',
		multiplier: 1 / (24 * 30),
	},
];

interface ITimeUnitConversion {
	value: number;
	timeUnitValue: SettingPeriod;
}
export const convertHoursValueToRelevantUnit = (
	value: number,
): ITimeUnitConversion => {
	if (value)
		for (let idx = TimeUnits.length - 1; idx >= 0; idx -= 1) {
			const timeUnit = TimeUnits[idx];
			const convertedValue = timeUnit.multiplier * value;

			if (
				convertedValue >= 1 &&
				convertedValue === parseInt(`${convertedValue}`, 10)
			) {
				return { value: convertedValue, timeUnitValue: timeUnit.value };
			}
		}
	return { value, timeUnitValue: TimeUnits[0].value };
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
