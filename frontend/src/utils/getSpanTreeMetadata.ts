import { pushDStree } from 'store/actions';

/**
 * Traverses the Span Tree data and returns the relevant meta data.
 * Metadata includes globalStart, globalEnd,
 */
export const getSpanTreeMetadata = (treeData: pushDStree) => {
	let globalStart = Number.POSITIVE_INFINITY;
	let globalEnd = Number.NEGATIVE_INFINITY;
	let totalSpans = 0;
	let levels = 1;
	const traverse = (treeNode: pushDStree, level: number = 0) => {
		if (!treeNode) {
			return;
		}
		totalSpans++;
		levels = Math.max(levels, level);
		const startTime = treeNode.startTime;
		const endTime = startTime + treeNode.value;
		globalStart = Math.min(globalStart, startTime);
		globalEnd = Math.max(globalEnd, endTime);

		for (const childNode of treeNode.children) {
			traverse(childNode, level + 1);
		}
	};
	traverse(treeData, 1);

	globalStart = globalStart * 1e6;
	globalEnd = globalEnd * 1e6;

	return {
		globalStart,
		globalEnd,
		spread: globalEnd - globalStart,
		totalSpans,
		levels,
	};
};
