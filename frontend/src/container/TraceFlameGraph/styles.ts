import styled from 'styled-components';

export const SpanItemContainer = styled.div`
	position: absolute;
	top: ${(props) => props.topOffset}px;
	left: ${(props) => props.leftOffset}%;
	width: ${(props) => props.width}%;
	height: 10px;
	margin: 1px 0;
	background-color: #0ca;
	border-radius: 5px;
	opacity: ${(props) => (props.selected ? 1 : 0.3)};
`;

export const TraceFlameGraphContainer = styled.div`
	position: relative;
	border: 1px dotted #ccc;
	width: 100%;
	height: ${({ height }) => (height ? height : 120)}px;
`;
