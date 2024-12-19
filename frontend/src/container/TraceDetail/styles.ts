import { volcano } from '@ant-design/colors';
import { Col } from 'antd';
import styled, { css } from 'styled-components';

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
		margin: 1rem 1rem 0 0;
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
	align-items: center;
	justify-content: center;
`;

export const timelineContainer = css`
	overflow: visible;
	margin: 0 1rem 0 0;
`;
export const ganttChartContainer = css`
	margin: 0 1rem 0.5rem;
	display: flex;
	flex-direction: column;
	position: relative;
	flex: 1;
	overflow-y: auto;
	overflow-x: scroll;
`;

export const selectedSpanDetailContainer = css`
	width: 100%;
	height: 100%;
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 12px;
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

export const GanttChartWrapper = styled.ul`
	padding-left: 0;
	position: absolute;
	width: 100%;
	height: 100%;

	ul {
		list-style: none;
		border-left: 1px solid #434343;
		padding-left: 1rem;
		width: 100%;
	}

	ul li {
		position: relative;

		&:before {
			position: absolute;
			left: -1rem;
			top: 10px;
			content: '';
			height: 1px;
			width: 1rem;
			background-color: #434343;
		}
	}
`;

export const FlameGraphMissingSpansContainer = styled.div`
	border: 1px dashed ${volcano[6]};
	padding: 0.5rem 0;
	margin-top: 1rem;
	border-radius: 0.25rem;
`;

export const TimeStampContainer = styled(Col)`
	display: flex;
	align-items: center;
	justify-content: center;
`;
