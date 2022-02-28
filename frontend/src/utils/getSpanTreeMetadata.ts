import { pushDStree } from 'store/actions';
import { errorColor } from 'lib/getRandomColor';
/**
 * Traverses the Span Tree data and returns the relevant meta data.
 * Metadata includes globalStart, globalEnd,
 */
export const getSpanTreeMetadata = (
	treeData: pushDStree,
	spanServiceColours: { [key: string]: string },
) => {
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
		const endTime = startTime + treeNode.value; //1647286351393
		if (treeNode.value === 1255346000) {
			debugger;
		}
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
	// 	globalEnd: 1647286351393000000
	// globalStart: 1646031004846000000
	// spead: 1255346546999808


	// globalEnd: 1646768052846000000
	// globalStart: 1646031004846000000
	// spead: 737048000000000
	globalStart = globalStart * 1e6;
	globalEnd = globalEnd * 1e6;

	console.log({ globalStart, globalEnd, spread: globalEnd - globalStart });
	return {
		globalStart,
		globalEnd,
		spread: globalEnd - globalStart,
		totalSpans,
		levels,
		treeData,
	};
};
