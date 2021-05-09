import { uniqBy, uniq, maxBy, cloneDeep, find } from "lodash";
import { serviceMapStore } from "Src/store/actions";
import { graphDataType } from "./ServiceMap";

const MIN_WIDTH = 25;
const MAX_WIDTH = 50;
const MIN_HEIGHT = 10;
const MAX_HEIGHT = 15;
const DEFAULT_FONT_SIZE = 4;
export const getDimensions = (num, highest) => {
	const percentage = (num / highest) * 100;
	const width = (percentage * (MAX_WIDTH - MIN_WIDTH)) / 100 + MIN_WIDTH;
	const height = (percentage * (MAX_HEIGHT - MIN_HEIGHT)) / 100 + MIN_HEIGHT;
	const fontSize = DEFAULT_FONT_SIZE;
	return {
		fontSize,
		width,
		height,
	};
};

export const getGraphData = (serviceMap: serviceMapStore): graphDataType => {
	const { items, services } = serviceMap;
	const highestCallCount = maxBy(items, (e) => e.callCount).callCount;
	const highestCallRate = maxBy(services, (e) => e.callRate).callRate;
	const divNum = Number(
		String(1).padEnd(highestCallCount.toString().length, "0"),
	);

	const links = cloneDeep(items).map((node) => {
		const { parent, child, callCount } = node;
		return {
			source: parent,
			target: child,
			value: (100 - callCount / divNum) * 0.01,
		};
	});
	const uniqParent = uniqBy(cloneDeep(items), "parent").map((e) => e.parent);
	const uniqChild = uniqBy(cloneDeep(items), "child").map((e) => e.child);
	const uniqNodes = uniq([...uniqParent, ...uniqChild]);
	const nodes = uniqNodes.map((node, i) => {
		const service = find(services, (service) => service.serviceName === node);
		let color = "#84ff00";
		if (!service) {
			return {
				id: node,
				group: i + 1,
				fontSize: DEFAULT_FONT_SIZE,
				width: MIN_WIDTH,
				height: MIN_HEIGHT,
				color,
				nodeVal: MIN_WIDTH,
				callRate: 0,
				errorRate: 0,
				p99: 0,
			};
		}
		if (service.errorRate > 0) {
			color = "#f00a0a";
		} else if (service.fourXXRate > 0) {
			color = "#ebeb15";
		}
		const { fontSize, width, height } = getDimensions(service.callRate, highestCallRate);
		return {
			id: node,
			group: i + 1,
			fontSize,
			width,
			height,
			color,
			nodeVal: width,
			callRate: service.callRate,
			errorRate: service.errorRate,
			p99: service.p99,
		};
	});
	return {
		nodes,
		links,
	};
};
