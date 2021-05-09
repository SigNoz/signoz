import { uniqBy, uniq, maxBy, cloneDeep } from "lodash";
import { servicesMapItem } from "Src/store/actions";
import { graphDataType } from "./ServiceMap";

export const getGraphData = (item: servicesMapItem[]): graphDataType => {
	const highestNum = maxBy(item, (e) => e.callCount).callCount;
	const divNum = Number(String(1).padEnd(highestNum.toString().length, "0"));

	const links = cloneDeep(item).map((node) => {
		const { parent, child, callCount } = node;
		return {
			source: parent,
			target: child,
			value: (100 - callCount / divNum) * 0.01,
		};
	});
	const uniqParent = uniqBy(cloneDeep(item), "parent").map((e) => e.parent);
	const uniqChild = uniqBy(cloneDeep(item), "child").map((e) => e.child);
	const uniqNodes = uniq([...uniqParent, ...uniqChild]);
	const nodes = uniqNodes.map((node, i) => ({
		id: node,
		group: i + 1,
	}));
	return {
		nodes,
		links,
	};
};
