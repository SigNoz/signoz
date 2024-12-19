/*eslint-disable*/
//@ts-nocheck

import { cloneDeep, find, maxBy, uniq, uniqBy, groupBy, sumBy } from 'lodash-es';
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

export const getGraphData = (serviceMap, isDarkMode): graphDataType => {
	const { items } = serviceMap;
	const services = Object.values(groupBy(items, 'child')).map((e) => {
		return {
			serviceName: e[0].child,
			errorRate: sumBy(e, 'errorRate'),
			callRate: sumBy(e, 'callRate'),
		}
	});
	const highestCallCount = maxBy(items, (e) => e?.callCount)?.callCount;
	const highestCallRate = maxBy(services, (e) => e?.callRate)?.callRate;

	const divNum = Number(
		String(1).padEnd(highestCallCount.toString().length, '0'),
	);

	const links = cloneDeep(items).map((node) => {
		const { parent, child, callCount, callRate, errorRate, p99 } = node;
		return {
			source: parent,
			target: child,
			value: (100 - callCount / divNum) * 0.03,
			callRate,
			errorRate,
			p99,
		};
	});
	const uniqParent = uniqBy(cloneDeep(items), 'parent').map((e) => e.parent);
	const uniqChild = uniqBy(cloneDeep(items), 'child').map((e) => e.child);
	const uniqNodes = uniq([...uniqParent, ...uniqChild]);
	const nodes = uniqNodes.map((node, i) => {
		const service = find(services, (service) => service.serviceName === node);
		let color = isDarkMode ? '#7CA568' : '#D5F2BB';
		if (!service) {
			return {
				id: node,
				group: i + 1,
				fontSize: DEFAULT_FONT_SIZE,
				width: MIN_WIDTH,
				color,
				nodeVal: MIN_WIDTH,
				name: node,
			};
		}
		if (service.errorRate > 0) {
			color = isDarkMode ? '#DB836E' : '#F98989';
		}
		const { fontSize, width } = getDimensions(service.callRate, highestCallRate);
		return {
			id: node,
			group: i + 1,
			fontSize,
			width,
			color,
			nodeVal: width,
			name: node,
		};
	});
	return {
		nodes,
		links,
	};
};

export const getZoomPx = (): number => {
	const { width } = window.screen;
	if (width < 1400) {
		return 190;
	}
	if (width > 1400 && width < 1700) {
		return 380;
	}
	if (width > 1700) {
		return 470;
	}
	return 190;
};

const getRound2DigitsAfterDecimal = (num: number) => {
	if (num === 0) {
		return 0;
	}
	return num.toFixed(20).match(/^-?\d*\.?0*\d{0,2}/)[0];
}

export const getTooltip = (link: {
	p99: number;
	errorRate: number;
	callRate: number;
	id: string;
}) => {
	return `<div style="color:#333333;padding:12px;background: white;border-radius: 2px;">
								<div class="keyval">
									<div class="key">P99 latency:</div>
									<div class="val">${getRound2DigitsAfterDecimal(link.p99/ 1000000)}ms</div>
								</div>
								<div class="keyval">
									<div class="key">Request:</div>
									<div class="val">${getRound2DigitsAfterDecimal(link.callRate)}/sec</div>
								</div>
								<div class="keyval">
									<div class="key">Error Rate:</div>
									<div class="val">${getRound2DigitsAfterDecimal(link.errorRate)}%</div>
								</div>
							</div>`;
};

export const transformLabel = (label: string, zoomLevel: number) => {
	//? 13 is the minimum label length. Scaling factor of 0.9 which is slightly less than 1
	//? ensures smoother zoom transitions, gradually increasing MAX_LENGTH, displaying more of the label as
	//? zooming in.
	const MAX_LENGTH = 13 * (zoomLevel / 0.9);
	const MAX_SHOW = MAX_LENGTH - 3;
	if (label.length > MAX_LENGTH) {
		return `${label.slice(0, MAX_SHOW)}...`;
	}
	return label;
};
