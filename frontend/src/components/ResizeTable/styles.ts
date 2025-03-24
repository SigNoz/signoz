import styled from 'styled-components';

interface SpanStyleProps {
	className: string;
	onClick?: (e: any) => void;
	children?: React.ReactNode;
}
interface DragSpanStyleProps {
	className: string;
	children?: React.ReactNode;
}

export const SpanStyle = styled.span<SpanStyleProps>`
	position: absolute;
	right: -0.313rem;
	bottom: 0;
	z-index: 1;
	width: 0.625rem;
	height: 100%;
	cursor: col-resize;
`;

export const DragSpanStyle = styled.span<DragSpanStyleProps>`
	display: flex;
	margin: -1rem;
	padding: 1rem;
`;
