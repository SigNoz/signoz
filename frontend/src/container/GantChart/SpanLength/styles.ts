import { Typography } from 'antd';
import styled from 'styled-components';

interface Props {
	width: string;
	bgColor: string;
	leftoffset: string;
	isdarkmode: boolean;
}

export const SpanLine = styled.div<Props>`
	width: ${({ leftoffset }): string => `${leftoffset}%`};
	height: 0px;
	border-bottom: 0.1px solid
		${({ isdarkmode }): string => (isdarkmode ? '#303030' : '#c0c0c0')};
	top: 50%;
	position: absolute;
`;
export const SpanBorder = styled.div<Props>`
	background: ${({ bgColor }): string => bgColor};
	border-radius: 5px;
	height: 0.625rem;
	width: ${({ width }): string => `${width}%`};
	left: ${({ leftoffset }): string => `${leftoffset}%`};
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
interface SpanTextProps extends Pick<Props, 'leftoffset'> {
	isDarkMode: boolean;
}

export const SpanText = styled(Typography)<SpanTextProps>`
	&&& {
		left: ${({ leftoffset }): string => `${leftoffset}%`};
		top: 65%;
		position: absolute;
		color: ${({ isDarkMode }): string => (isDarkMode ? '##ACACAC' : '#666')};
		font-size: 0.75rem;
	}
`;
