// Doing DFS traversal on the tree
// resultCount : how many entries you want. where -1 means all possible entries.
// func(obj) : takes one element of the data structure and returns true if need to select or not

// program to implement stack data structure
import { isEmpty } from "lodash-es";

const getTreeData = (tree, callback, resultCount = -1) => {
	if (resultCount === 0 || isEmpty(tree) || tree.id === "empty") return null;

	let data = tree;
	let result = [];
	let stk = [];
	stk.push(data);

	while (!isEmpty(stk)) {
		let x = stk[stk.length - 1];

		// marked means seeing the node for the second time.
		if (x.marked) {
			delete x.marked;
			stk.pop();
			x.map((item) => {
				if (callback(item) === true) {
					result.push(item);
					if (resultCount !== -1 && result.length === resultCount) return result;
				}
			});
		} else {
			x.marked = true;
			x.map((item) => {
				if (item.children.length > 0) {
					stk.push(item.children);
				}
			});
		}
	}
	return result;
};

export default getTreeData;
