import { Typography } from 'antd';
import styled from 'styled-components';

interface Props {
	width: string;
	leftOffset: string;
	bgColor: string;
}

export const SpanBorder = styled.div<Props>`
	background: ${({ bgColor }) => bgColor};
	border-radius: 5px;
	height: 0.625rem;
	width: ${({ width }) => `${width}%`};
	left: ${({ leftOffset }) => `${leftOffset}%`};
	top: 35%;

	position: absolute;
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

export const SpanText = styled(Typography)<Pick<Props, 'leftOffset'>>`
	&&& {
		left: ${({ leftOffset }) => `${leftOffset}%`};
		top: 65%;

		position: absolute;
		color: #acacac;
		font-size: 0.75rem;
	}
`;
