import { css } from 'styled-components';

/**
 * Styles for the left container. Containers flamegraph, timeline and gantt chart
 */
export const leftContainer = [
	css`
		display: flex;
		flex-direction: column;
	`,
];

/**
 * Styles for the top container. Contains TotalSpans, FlameGraph and Timeline.
 */
export const flameAndTimelineContainer = [
	css`
		margin: 0 1rem 0 0;
	`,
];

export const traceMetaDataContainer = [
	css`
		display: flex;
		flex-direction: column;
		align-items: center;
	`,
];

export const traceDateAndTimelineContainer = css`
	margin-top: 2rem;
`;

export const traceDateTimeContainer = css`
	display: flex;
	aligh-items: center;
	justify-content: center;
`;
export const timelineContainer = css`
	overflow: visible;
	margin: 0 1rem 0 0;
`;
export const ganttChartContainer = css`
	margin: 1.5rem 1rem 0.5rem;
	display: flex;
	flex-direction: column;
	position: relative;
	flex: 1;
	overflow-y: auto;
	overflow-x: hidden;
`;

export const selectedSpanDetailContainer = css`
	height: 100%;
	position: relative;
	display: flex;
	flex-direction: column;
`;

/**
 * Generic / Common styles
 */

export const verticalSeparator = css`
	height: 100%;
	margin: 0;
`;

export const traceDetailContentSpacing = css`
	margin: 0 1rem 0 0;
`;

export const floatRight = css`
	float: right;
`;
export const removeMargin = css`
	margin: 0;
`;
