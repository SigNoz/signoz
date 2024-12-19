import { set } from 'lodash-es';
import { ITraceForest, ITraceTree } from 'types/api/trace/getTraceItem';

interface GetTraceMetaData {
	globalStart: number;
	globalEnd: number;
	spread: number;
	totalSpans: number;
	levels: number;
}
export const getMetaDataFromSpanTree = (
	treeData: ITraceTree,
): GetTraceMetaData => {
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
		const { startTime } = treeNode;
		const endTime = startTime + treeNode.value;
		globalStart = Math.min(globalStart, startTime);
		globalEnd = Math.max(globalEnd, endTime);

		treeNode.children.forEach((childNode) => {
			traverse(childNode, level + 1);
		});
	};
	traverse(treeData, 1);

	globalStart *= 1e6;
	globalEnd *= 1e6;

	return {
		globalStart,
		globalEnd,
		spread: globalEnd - globalStart,
		totalSpans,
		levels,
	};
};

export function getTopLeftFromBody(
	elem: HTMLElement,
): { top: number; left: number } {
	const box = elem.getBoundingClientRect();

	const { body } = document;
	const docEl = document.documentElement;

	const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
	const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

	const clientTop = docEl.clientTop || body.clientTop || 0;
	const clientLeft = docEl.clientLeft || body.clientLeft || 0;

	const top = box.top + scrollTop - clientTop;
	const left = box.left + scrollLeft - clientLeft;

	return { top: Math.round(top), left: Math.round(left) };
}

export const getNodeById = (
	searchingId: string,
	treesData: ITraceForest | undefined,
): ITraceForest => {
	const newtreeData: ITraceForest = {} as ITraceForest;

	const traverse = (
		treeNode: ITraceTree,
		setCallBack: (arg0: ITraceTree) => void,
		level = 0,
	): void => {
		if (!treeNode) {
			return;
		}

		if (searchingId === treeNode.id) {
			setCallBack(treeNode);
		}

		treeNode.children.forEach((childNode) => {
			traverse(childNode, setCallBack, level + 1);
		});
	};

	const spanTreeSetCallback = (
		path: (keyof ITraceForest)[],
		value: ITraceTree,
	): ITraceForest => set(newtreeData, path, [value]);

	if (treesData?.spanTree)
		treesData.spanTree.forEach((tree) => {
			traverse(tree, (value) => spanTreeSetCallback(['spanTree'], value), 1);
		});

	if (treesData?.missingSpanTree)
		treesData.missingSpanTree.forEach((tree) => {
			traverse(
				tree,
				(value) => spanTreeSetCallback(['missingSpanTree'], value),
				1,
			);
		});

	return newtreeData;
};

const getSpanWithoutChildren = (
	span: ITraceTree,
): Omit<ITraceTree, 'children'> => ({
	id: span.id,
	name: span.name,
	parent: span.parent,
	serviceColour: span.serviceColour,
	serviceName: span.serviceName,
	startTime: span.startTime,
	tags: span.tags,
	time: span.time,
	value: span.value,
	event: span.event,
	hasError: span.hasError,
	spanKind: span.spanKind,
	statusCodeString: span.statusCodeString,
	statusMessage: span.statusMessage,
});

export const isSpanPresentInSearchString = (
	searchedString: string,
	tree: ITraceTree,
): boolean => {
	const parsedTree = getSpanWithoutChildren(tree);

	const stringifyTree = JSON.stringify(parsedTree);

	return stringifyTree.includes(searchedString);
};

export const isSpanPresent = (
	tree: ITraceTree,
	searchedKey: string,
): ITraceTree[] => {
	const foundNode: ITraceTree[] = [];

	const traverse = (
		treeNode: ITraceTree,
		level = 0,
		foundNode: ITraceTree[],
	): void => {
		if (!treeNode) {
			return;
		}

		const isPresent = isSpanPresentInSearchString(searchedKey, treeNode);

		if (isPresent) {
			foundNode.push(treeNode);
		}

		treeNode.children.forEach((childNode) => {
			traverse(childNode, level + 1, foundNode);
		});
	};
	traverse(tree, 1, foundNode);

	return foundNode;
};

export const getSpanPath = (tree: ITraceTree, spanId: string): string[] => {
	const spanPath: string[] = [];

	const traverse = (treeNode: ITraceTree): boolean => {
		if (!treeNode) {
			return false;
		}

		spanPath.push(treeNode.id);

		if (spanId === treeNode.id) {
			return true;
		}

		let foundInChild = false;
		treeNode.children.forEach((childNode) => {
			if (traverse(childNode)) foundInChild = true;
		});
		if (!foundInChild) {
			spanPath.pop();
		}
		return foundInChild;
	};
	traverse(tree);
	return spanPath;
};
