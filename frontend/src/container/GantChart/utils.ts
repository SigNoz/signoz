import { ITraceTree } from 'types/api/trace/getTraceItem';

export const getMetaDataFromSpanTree = (treeData: ITraceTree) => {
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

export function getTopLeftFromBody(elem: HTMLElement) {
	let box = elem.getBoundingClientRect();

	let body = document.body;
	let docEl = document.documentElement;

	let scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
	let scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

	let clientTop = docEl.clientTop || body.clientTop || 0;
	let clientLeft = docEl.clientLeft || body.clientLeft || 0;

	let top = box.top + scrollTop - clientTop;
	let left = box.left + scrollLeft - clientLeft;

	return { top: Math.round(top), left: Math.round(left) };
}

export const getNodeById = (
	searchingId: string,
	treeData: ITraceTree,
): ITraceTree | undefined => {
	let foundNode: ITraceTree | undefined = undefined;
	const traverse = (treeNode: ITraceTree, level: number = 0) => {
		if (!treeNode) {
			return;
		}

		if (searchingId == treeNode.id) {
			foundNode = treeNode;
		}

		for (const childNode of treeNode.children) {
			traverse(childNode, level + 1);
		}
	};
	traverse(treeData, 1);

	return foundNode;
};

const getSpanWithoutChildren = (
	span: ITraceTree,
): Omit<ITraceTree, 'children'> => {
	return {
		id: span.id,
		name: span.name,
		parent: span.parent,
		serviceColour: span.serviceColour,
		serviceName: span.serviceName,
		startTime: span.startTime,
		tags: span.tags,
		time: span.time,
		value: span.value,
		error: span.error,
		hasError: span.hasError,
	};
};

export const isSpanPresentInSearchString = (
	searchedString: string,
	tree: ITraceTree,
): boolean => {
	const parsedTree = getSpanWithoutChildren(tree);

	const stringifyTree = JSON.stringify(parsedTree);

	if (stringifyTree.includes(searchedString)) {
		return true;
	}
	return false;
};

export const isSpanPresent = (
	tree: ITraceTree,
	searchedKey: string,
): ITraceTree[] => {
	const foundNode: ITraceTree[] = [];

	const traverse = (
		treeNode: ITraceTree,
		level: number = 0,
		foundNode: ITraceTree[],
	) => {
		if (!treeNode) {
			return;
		}

		const isPresent = isSpanPresentInSearchString(searchedKey, treeNode);

		if (isPresent) {
			foundNode.push(treeNode);
		}

		for (const childNode of treeNode.children) {
			traverse(childNode, level + 1, foundNode);
		}
	};
	traverse(tree, 1, foundNode);

	return foundNode;
};

export const getSpanPath = (tree: ITraceTree, spanId: string): string[] => {
	const spanPath: string[] = [];

	const traverse = (treeNode: ITraceTree) => {
		if (!treeNode) {
			return false;
		}

		spanPath.push(treeNode.id);

		if (spanId === treeNode.id) {
			return true;
		}

		let foundInChild = false;
		for (const childNode of treeNode.children) {
			if (traverse(childNode)) foundInChild = true;
		}
		if (!foundInChild) {
			spanPath.pop();
		}
		return foundInChild;
	};
	traverse(tree);
	return spanPath;
};
