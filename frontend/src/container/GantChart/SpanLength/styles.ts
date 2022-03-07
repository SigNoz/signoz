import { Typography } from 'antd';
import styled from 'styled-components';

interface Props {
	width: string;
	bgColor: string;
	leftoffset: string;
	isdarkmode: boolean;
}

export const SpanLine = styled.div<Props>`
	width: ${({ leftoffset }) => `${leftoffset}%`};
	height: 0px;
	border-bottom: 0.1px solid
		${({ isdarkmode }) => (isdarkmode ? '#303030' : '#c0c0c0')};
	top: 50%;
	position: absolute;
`;
export const SpanBorder = styled.div<Props>`
	background: ${({ bgColor }) => bgColor};
	border-radius: 5px;
	height: 0.625rem;
	width: ${({ width }) => `${width}%`};
	left: ${({ leftoffset }) => `${leftoffset}%`};
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
	min-height: 2rem;
`;

export const SpanText = styled(Typography)<{
	leftoffset: string;
	isdarkmode: boolean;
}>`
	&&& {
		left: ${({ leftoffset }) => `${leftoffset}%`};
		top: 65%;
		position: absolute;
		color: ${({ isdarkmode }) => (isdarkmode ? '##ACACAC' : '#666')};
		font-size: 0.75rem;
	}
`;
