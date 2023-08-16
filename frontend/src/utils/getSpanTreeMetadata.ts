/* eslint-disable no-param-reassign */
import { themeColors } from 'constants/theme';
import { ITraceForest, ITraceTree } from 'types/api/trace/getTraceItem';
/**
 * Traverses the Span Tree data and returns the relevant meta data.
 * Metadata includes globalStart, globalEnd,
 */
export const getSpanTreeMetadata = (
	treesData: ITraceForest,
	spanServiceColours: { [key: string]: string },
): GetSpanTreeMetaData => {
	let globalStart = Number.POSITIVE_INFINITY;
	let globalEnd = Number.NEGATIVE_INFINITY;
	let totalSpans = 0;
	let levels = 1;

	const traverse = (treeNode: ITraceTree, level = 0): void => {
		if (!treeNode) {
			return;
		}
		totalSpans += 1;
		levels = Math.max(levels, level);
		const { startTime, value } = treeNode;
		if (startTime !== null && value !== null) {
			const endTime = startTime + value / 1e6;
			globalStart = Math.min(globalStart, startTime);
			globalEnd = Math.max(globalEnd, endTime);
		}
		if (treeNode.hasError) {
			treeNode.serviceColour = themeColors.errorColor;
		} else treeNode.serviceColour = spanServiceColours[treeNode.serviceName];
		treeNode.children.forEach((childNode) => {
			traverse(childNode, level + 1);
		});
	};
	treesData.spanTree.forEach((treeData) => {
		traverse(treeData, 1);
	});
	treesData.missingSpanTree.forEach((treeData) => {
		traverse(treeData, 1);
	});

	return {
		globalStart,
		globalEnd,
		spread: globalEnd - globalStart,
		totalSpans,
		levels,
		treesData,
	};
};

interface GetSpanTreeMetaData {
	globalStart: number;
	globalEnd: number;
	spread: number;
	totalSpans: number;
	levels: number;
	treesData: ITraceForest;
}
