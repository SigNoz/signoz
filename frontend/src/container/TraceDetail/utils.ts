/**
 * string is present on the span or not
 */
import { ITraceTree, Span } from 'types/api/trace/getTraceItem';
import { isEmpty, sortBy } from 'lodash-es';

export const filterSpansByString = (
	searchString: string,
	spans: Span[],
): Span[] =>
	spans.filter((span) => {
		const spanWithoutChildren = [...span].slice(0, 10);
		return JSON.stringify(spanWithoutChildren).includes(searchString);
	});

export const getSortedData = (treeData: ITraceTree) => {
	const traverse = (treeNode: ITraceTree, level: number = 0) => {
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
