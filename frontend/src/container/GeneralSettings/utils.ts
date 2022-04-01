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

export const convertHoursValueToRelevantUnit = (
	value: number,
): { value: number; timeUnitValue: SettingPeriod } => {
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
