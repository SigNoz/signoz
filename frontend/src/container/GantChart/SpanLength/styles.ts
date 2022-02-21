import styled from 'styled-components';

interface Props {
	percentage: string;
	leftOffset: string;
}

export const SpanBorder = styled.div<Props>`
	background: #8fd460;
	border-radius: 5px;
	height: 0.625rem;
	width: ${({ percentage }) => `${percentage}%`};
	padding-left: ${({ leftOffset }) => `${leftOffset}px`};
`;

export const SpanWrapper = styled.div`
	display: flex;
	width: 100%;
	flex-direction: row;
	align-items: center;
	position: relative;
	z-index: 2;

	&:before {
		display: inline-block;
		content: '';
		border-bottom: 1px solid #303030;
		position: absolute;
		left: -30px;
		width: 30px;
		z-index: 0;
	}
`;
