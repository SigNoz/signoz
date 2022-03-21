import styled, { css } from 'styled-components';

const timelineContainer = css`
	flex: 1;
	overflow: visible;
`;

export const styles = {
	timelineContainer,
};
export const Svg = styled.svg`
	overflow: visible !important;
	position: absolute;
`;

export const TimelineInterval = styled.g`
	text-anchor: middle;
	font-size: 0.6rem;
`;
