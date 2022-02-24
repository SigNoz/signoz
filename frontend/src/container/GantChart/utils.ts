import { pushDStree } from 'store/actions';

export const getMetaDataFromSpanTree = (treeData: pushDStree) => {
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
	treeData: pushDStree,
): pushDStree | undefined => {
	let foundNode: pushDStree | undefined = undefined;
	const traverse = (treeNode: pushDStree, level: number = 0) => {
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
	span: pushDStree,
): Omit<pushDStree, 'children'> => {
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
	};
};

export const isSpanPresentInSearchString = (
	searchedString: string,
	tree: pushDStree,
): boolean => {
	const parsedTree = getSpanWithoutChildren(tree);

	const stringifyTree = JSON.stringify(parsedTree);

	if (stringifyTree.includes(searchedString)) {
		return true;
	}
	return false;
};

export const isSpanPresent = (
	tree: pushDStree,
	searchedKey: string,
): pushDStree[] => {
	const foundNode: pushDStree[] = [];

	const traverse = (
		treeNode: pushDStree,
		level: number = 0,
		foundNode: pushDStree[],
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

export const getSpanPath = (tree: pushDStree, spanId: string): string[] => {
	const spanPath = [];
	
	const traverse = (treeNode) => {
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
