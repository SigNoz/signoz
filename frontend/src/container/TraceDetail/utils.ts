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

export const resolveTimeFromInterval = (
	intervalTime: number,
	intervalUnit: IIntervalUnit,
): number => intervalTime * intervalUnit.multiplier;

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

export const getSortedData = (treeData: ITraceTree): ITraceTree => {
	const traverse = (treeNode: ITraceTree, level = 0): void => {
		if (!treeNode) {
			return;
		}

		// need this rule to disable
		// eslint-disable-next-line no-param-reassign
		treeNode.children = sortBy(treeNode.children, (e) => e.startTime);

		treeNode.children.forEach((childNode) => {
			traverse(childNode, level + 1);
		});
	};
	traverse(treeData, 1);

	return treeData;
};

export const getTreeLevelsCount = (tree: ITraceTree): number => {
	if (!tree) {
		return 0;
	}

	let levels = 1;

	const traverse = (treeNode: ITraceTree, level: number): void => {
		if (!treeNode) {
			return;
		}

		levels = Math.max(level, levels);

		treeNode.children.forEach((childNode) => {
			traverse(childNode, level + 1);
		});
	};
	traverse(tree, levels);

	return levels;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
