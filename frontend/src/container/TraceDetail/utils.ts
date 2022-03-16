/**
 * string is present on the span or not
 */
import { sortBy } from 'lodash-es';
import { ITraceTree, Span } from 'types/api/trace/getTraceItem';

export const filterSpansByString = (
	searchString: string,
	spans: Span[],
): Span[] =>
	spans.filter((span) => {
		const spanWithoutChildren = [...span].slice(0, 11);
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
): number => {
	return intervalTime * intervalUnit.multiplier;
};

export const getSortedData = (treeData: ITraceTree): undefined | ITraceTree => {
	const traverse = (treeNode: ITraceTree, level = 0): void => {
		if (!treeNode) {
			return;
		}

		treeNode.children = sortBy(treeNode.children, (e) => e.startTime);

		for (const childNode of treeNode.children) {
			traverse(childNode, level + 1);
		}
	};
	traverse(treeData, 1);

	return treeData;
};
