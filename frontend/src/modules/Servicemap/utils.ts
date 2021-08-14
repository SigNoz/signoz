import { uniqBy, uniq, maxBy, cloneDeep, find } from 'lodash';
import { serviceMapStore } from 'Src/store/actions';
import { graphDataType } from './ServiceMap';

const MIN_WIDTH = 10;
const MAX_WIDTH = 20;
const DEFAULT_FONT_SIZE = 6;
export const getDimensions = (num, highest) => {
	const percentage = (num / highest) * 100;
	const width = (percentage * (MAX_WIDTH - MIN_WIDTH)) / 100 + MIN_WIDTH;
	const fontSize = DEFAULT_FONT_SIZE;
	return {
		fontSize,
		width,
	};
};

export const getGraphData = (serviceMap: serviceMapStore): graphDataType => {
	const { items, services } = serviceMap;
	const highestCallCount = maxBy(items, (e) => e.callCount).callCount;
	const highestCallRate = maxBy(services, (e) => e.callRate).callRate;
	const divNum = Number(
		String(1).padEnd(highestCallCount.toString().length, '0'),
	);

	const links = cloneDeep(items).map((node) => {
		const { parent, child, callCount } = node;
		return {
			source: parent,
			target: child,
			value: (100 - callCount / divNum) * 0.03,
		};
	});
	const uniqParent = uniqBy(cloneDeep(items), 'parent').map((e) => e.parent);
	const uniqChild = uniqBy(cloneDeep(items), 'child').map((e) => e.child);
	const uniqNodes = uniq([...uniqParent, ...uniqChild]);
	const nodes = uniqNodes.map((node, i) => {
		const service = find(services, (service) => service.serviceName === node);
		let color = '#88CEA5';
		if (!service) {
			return {
				id: node,
				group: i + 1,
				fontSize: DEFAULT_FONT_SIZE,
				width: MIN_WIDTH,
				color,
				nodeVal: MIN_WIDTH,
				callRate: 0,
				errorRate: 0,
				p99: 0,
			};
		}
		if (service.errorRate > 0) {
			color = '#F98989';
		} else if (service.fourXXRate > 0) {
			color = '#F9DA7B';
		}
		const { fontSize, width } = getDimensions(service.callRate, highestCallRate);
		return {
			id: node,
			group: i + 1,
			fontSize,
			width,
			color,
			nodeVal: width,
			callRate: service.callRate.toFixed(2),
			errorRate: service.errorRate,
			p99: service.p99,
		};
	});
	return {
		nodes,
		links,
	};
};

export const getZoomPx = (): number => {
	const width = window.screen.width;
	if (width < 1400) {
		return 190;
	} else if (width > 1400 && width < 1700) {
		return 380;
	} else if (width > 1700) {
		return 470;
	}
	return 190;
};

export const getTooltip = (node: {
	p99: number;
	errorRate: number;
	callRate: number;
	id: string;
}) => {
	return `<div style="color:#333333;padding:12px;background: white;border-radius: 2px;">
								<div style="font-weight:bold; margin-bottom:16px;">${node.id}</div>
								<div class="keyval">
									<div class="key">P99 latency:</div>
									<div class="val">${node.p99 / 1000000}ms</div>
								</div>
								<div class="keyval">
									<div class="key">Request:</div>
									<div class="val">${node.callRate}/sec</div>
								</div>
								<div class="keyval">
									<div class="key">Error Rate:</div>
									<div class="val">${node.errorRate}%</div>
								</div>
							</div>`;
};

export const transformLabel = (label: string) => {
	const MAX_LENGTH = 13;
	const MAX_SHOW = 10;
	if (label.length > MAX_LENGTH) {
		return `${label.slice(0, MAX_SHOW)}...`;
	}
	return label;
};
