import { isEmpty } from 'lodash-es';
import { pushDStree } from 'Src/store/actions';

interface itemProps {
	treeData: pushDStree[];
	marked: boolean;
}

// Doing DFS traversal on the tree.
// Callback to be called for each element in the tree once.
const traverseTreeData = (
	tree: pushDStree[],
	callback: (item: pushDStree) => void,
): void => {
	if (isEmpty(tree) || tree[0].id === 'empty') return;
	const node = { treeData: tree, marked: false };
	const stk: [itemProps] = [node];

	while (!isEmpty(stk)) {
		const x = stk[stk.length - 1];

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

export default traverseTreeData;
