/**
 * string is present on the span or not
 */
import { Span } from 'types/api/trace/getTraceItem';

export const filterSpansByString = (
	searchString: string,
	spans: Span[],
): Span[] =>
	spans.filter((span) => {
		const spanWithoutChildren = [...span].slice(0, 10);
		return JSON.stringify(spanWithoutChildren).includes(searchString);
	});

export interface IIntervalUnit {
	name: 'ms' | 's' | 'm';
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
];

export const resolveTimeFromInterval = (
	intervalTime: number,
	intervalUnit: IIntervalUnit,
) => {
	return intervalTime * intervalUnit.multiplier;
};
