/**
 * string is present on the span or not
 */
import { sortBy } from 'lodash-es';
import { ITraceTree, Span } from 'types/api/trace/getTraceItem';
import { IIntervalUnit } from 'utils/traceUtils';

export const filterSpansByString = (
	searchString: string,
	spans: Span[],
): Span[] =>
	spans.filter((span) => {
		const spanWithoutChildren = [...span].slice(0, 11);
		return JSON.stringify(spanWithoutChildren).includes(searchString);
	});

export const SPAN_DETAILS_LEFT_COL_WIDTH = 350;

export const resolveTimeFromInterval = (
	intervalTime: number,
	intervalUnit: IIntervalUnit,
): number => intervalTime * intervalUnit.multiplier;

export const getSortedData = (treeData: ITraceTree): ITraceTree => {
	const traverse = (treeNode: ITraceTree, level = 0): void => {
		if (!treeNode) {
			return;
		}

		// need this rule to disable
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

export {
	convertTimeToRelevantUnit,
	formUrlParams,
	INTERVAL_UNITS,
} from 'utils/traceUtils';
export type { IIntervalUnit } from 'utils/traceUtils';
