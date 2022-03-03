import { errorColor } from 'lib/getRandomColor';
import { ITraceTree } from 'types/api/trace/getTraceItem';
/**
 * Traverses the Span Tree data and returns the relevant meta data.
 * Metadata includes globalStart, globalEnd,
 */
export const getSpanTreeMetadata = (
	treeData: ITraceTree,
	spanServiceColours: { [key: string]: string },
) => {
	let globalStart = Number.POSITIVE_INFINITY;
	let globalEnd = Number.NEGATIVE_INFINITY;
	let totalSpans = 0;
	let levels = 1;
	const traverse = (treeNode: ITraceTree, level: number = 0) => {
		if (!treeNode) {
			return;
		}
		totalSpans++;
		levels = Math.max(levels, level);
		const startTime = treeNode.startTime;
		const endTime = startTime + treeNode.value / 1e6;
		globalStart = Math.min(globalStart, startTime);
		globalEnd = Math.max(globalEnd, endTime);
		if (treeNode.hasError) {
			treeNode.serviceColour = errorColor;
		} else treeNode.serviceColour = spanServiceColours[treeNode.serviceName];
		for (const childNode of treeNode.children) {
			traverse(childNode, level + 1);
		}
	};
	traverse(treeData, 1);

	return {
		globalStart,
		globalEnd,
		spread: globalEnd - globalStart,
		totalSpans,
		levels,
		treeData,
	};
};
