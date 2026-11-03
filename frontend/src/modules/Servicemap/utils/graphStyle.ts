import {
	ERROR_RATE_THRESHOLD,
	MAX_NODE_RADIUS,
	MIN_NODE_RADIUS,
} from '../constants';
import type { ServiceMapLink, ServiceMapNode } from '../types';

export const getNodeRadius = (callRate: number, highestCallRate: number): number =>
	highestCallRate > 0
		? MIN_NODE_RADIUS +
			(callRate / highestCallRate) * (MAX_NODE_RADIUS - MIN_NODE_RADIUS)
		: MIN_NODE_RADIUS;

export const getNodeColor = (
	node: Pick<ServiceMapNode, 'errorRate'>,
	isDarkMode: boolean,
): string => {
	if (node.errorRate >= ERROR_RATE_THRESHOLD) {
		return isDarkMode ? '#DB836E' : '#F98989';
	}
	return isDarkMode ? '#7CA568' : '#D5F2BB';
};

const roundTo2Significant = (num: number): string =>
	num === 0 ? '0' : num.toFixed(20).match(/^-?\d*\.?0*\d{0,2}/)?.[0] ?? '0';

export const getLinkTooltip = (
	link: Pick<ServiceMapLink, 'p99' | 'errorRate' | 'callRate'>,
): string => `<div style="color:var(--l1-foreground);padding:12px;background:var(--l2-background);border:1px solid var(--l2-border);border-radius:2px;">
	<div class="keyval">
		<div class="key">P99 latency:</div>
		<div class="val">${roundTo2Significant(link.p99 / 1_000_000)}ms</div>
	</div>
	<div class="keyval">
		<div class="key">Request:</div>
		<div class="val">${roundTo2Significant(link.callRate)}/sec</div>
	</div>
	<div class="keyval">
		<div class="key">Error Rate:</div>
		<div class="val">${roundTo2Significant(link.errorRate)}%</div>
	</div>
</div>`;

export const transformLabel = (label: string, zoomLevel: number): string => {
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
