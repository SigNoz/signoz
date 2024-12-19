import { Typography } from 'antd';
import styled from 'styled-components';

interface Props {
	width: string;
	leftOffset: string;
	bgColor: string;
	isDarkMode: boolean;
}

export const SpanLine = styled.div<Props>`
	width: ${({ leftOffset }): string => `${leftOffset}%`};
	height: 0px;
	border-bottom: 0.1px solid
		${({ isDarkMode }): string => (isDarkMode ? '#303030' : '#c0c0c0')};
	top: 50%;
	position: absolute;
`;

export const SpanBorder = styled.div<Props>`
	background: ${({ bgColor }): string => bgColor};
	border-radius: 5px;
	height: 0.625rem;
	width: ${({ width }): string => `${width}%`};
	left: ${({ leftOffset }): string => `${leftOffset}%`};
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
interface SpanTextProps extends Pick<Props, 'leftOffset'> {
	isDarkMode: boolean;
}

export const SpanText = styled(Typography.Paragraph)<SpanTextProps>`
	&&& {
		left: ${({ leftOffset }): string => `${leftOffset}%`};
		top: 65%;
		position: absolute;
		width: max-content;
		color: ${({ isDarkMode }): string => (isDarkMode ? '#ACACAC' : '#666')};
		font-size: 0.75rem;
	}
`;
