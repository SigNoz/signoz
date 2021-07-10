import { has, isEmpty } from "lodash-es";
import { pushDStree } from "Src/store/actions";

interface itemProps {
	treeData: pushDStree[];
	marked: boolean;
}

export interface extendedPushDSTree extends pushDStree {
	parent?: pushDStree[];
}

/**
 * Function to traverse the tree data
 * This function takes a callback and the callee can execute any
 * logic in the callback
 * Currently its being used to sort, get max, search a node in the tree &
 * modify the tree to add parents
 * @param tree { pushDStree[] }
 * @param callback { Function }
 */
// Doing DFS traversal on the tree.
// Callback to be called for each element in the tree once.
export const traverseTreeData = (
	tree: pushDStree[],
	callback: (item: pushDStree) => void,
): void => {
	if (isEmpty(tree) || tree[0].id === "empty") return;
	let node = { treeData: tree, marked: false };
	let stk: [itemProps] = [node];

	while (!isEmpty(stk)) {
		let x = stk[stk.length - 1];

		// marked means seeing the node for the second time.
		if (x.marked) {
			x.marked = false;
			stk.pop();
			x.treeData.map((item: pushDStree) => {
				callback(item);
			});
		} else {
			x.marked = true;
			x.treeData.map((item) => {
				if (item.children.length > 0) {
					stk.push({ treeData: item.children, marked: false });
				}
			});
		}
	}
};

/**
 * Function to get the left padding for gantt chart lines
 * @param timeDiff { number } Diff between global end time & start time of the span
 * @param totalTime { number } Diff between global start time & global end time
 * @param totalWidth { number } Total width of the container
 */
export const getPaddingLeft = (
	timeDiff: number,
	totalTime: number,
	totalWidth: number,
): number => {
	return parseInt(((timeDiff / totalTime) * totalWidth).toFixed(0));
};

/**
 *
 * @param obj
 * @param arr
 */
export const getParentKeys = (
	obj: extendedPushDSTree = {
		children: [],
		id: "",
		name: "",
		startTime: 0,
		tags: [],
		time: 0,
		value: 0,
	},
	arr: string[],
): string[] => {
	if (!isEmpty(obj)) {
		let node = obj;
		while (has(node, "parent")) {
			arr.push(node?.parent?.id);
			node = node.parent;
		}
	}
	return arr;
};

export const emptyTreeObj: pushDStree = {
	id: "empty",
	name: "default",
	value: 0,
	time: 0,
	startTime: 0,
	tags: [],
	children: [],
};

export const emptyTree: pushDStree[] = [{ ...emptyTreeObj }];

export const extendedEmptyObj: extendedPushDSTree = {
	id: "empty",
	name: "default",
	value: 0,
	time: 0,
	startTime: 0,
	tags: [],
	children: [],
	parent: [],
};
export const extendedEmptyTree: extendedPushDSTree[] = [
	{ ...extendedEmptyObj },
];
