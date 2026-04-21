import { Color } from '@signozhq/design-tokens';
import { FontSize } from 'container/OptionsMenu/types';
import styled from 'styled-components';

interface TableBodyContentProps {
	linesPerRow: number;
	fontSize: FontSize;
	isDarkMode?: boolean;
}

export const TableBodyContent = styled.div<TableBodyContentProps>`
	margin-bottom: 0;
	color: ${(props): string =>
		props.isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400};
	font-size: 14px;
	font-style: normal;
	font-weight: 400;
	line-height: 18px; /* 128.571% */
	letter-spacing: -0.07px;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: ${(props): number => props.linesPerRow};
	line-clamp: ${(props): number => props.linesPerRow};
	-webkit-box-orient: vertical;
	${({ fontSize }): string =>
		fontSize === FontSize.SMALL
			? `font-size:11px; line-height:16px;`
			: fontSize === FontSize.MEDIUM
			? `font-size:13px; line-height:20px;`
			: `font-size:14px; line-height:24px;`}
`;
