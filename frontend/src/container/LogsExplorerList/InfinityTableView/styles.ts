/* eslint-disable no-nested-ternary */
import { themeColors } from 'constants/theme';
import { FontSize } from 'container/OptionsMenu/types';
import styled from 'styled-components';
import { getActiveLogBackground } from 'utils/logs';

interface TableHeaderCellStyledProps {
	$isDragColumn: boolean;
	$isDarkMode: boolean;
	$isLogIndicator?: boolean;
	fontSize?: FontSize;
}

export const TableStyled = styled.table`
	width: 100%;
`;

export const TableCellStyled = styled.td<TableHeaderCellStyledProps>`
	padding: 0.5rem;
	${({ fontSize }): string =>
		fontSize === FontSize.SMALL
			? `padding:0.3rem;`
			: fontSize === FontSize.MEDIUM
			? `padding:0.4rem;`
			: fontSize === FontSize.LARGE
			? `padding:0.5rem;`
			: ``}
	background-color: ${(props): string =>
		props.$isDarkMode ? 'inherit' : themeColors.whiteCream};

	${({ $isLogIndicator }): string =>
		$isLogIndicator ? 'padding: 0 0 0 8px;width: 15px;' : ''}
	color: ${(props): string =>
		props.$isDarkMode ? themeColors.white : themeColors.bckgGrey};
`;

export const TableRowStyled = styled.tr<{
	$isActiveLog: boolean;
	$isDarkMode: boolean;
	$logType: string;
}>`
	td {
		${({ $isActiveLog, $isDarkMode, $logType }): string =>
			$isActiveLog
				? getActiveLogBackground($isActiveLog, $isDarkMode, $logType)
				: ''};
	}

	cursor: pointer;
	position: relative;

	.log-line-action-buttons {
		display: none;
	}

	&:hover {
		${TableCellStyled} {
			${({ $isActiveLog, $isDarkMode }): string =>
				$isActiveLog
					? getActiveLogBackground()
					: `background-color: ${
							!$isDarkMode ? 'var(--bg-vanilla-200)' : 'rgba(171, 189, 255, 0.04)'
					  }`}
		}
		.log-line-action-buttons {
			display: flex;
		}
	}
`;

export const TableHeaderCellStyled = styled.th<TableHeaderCellStyledProps>`
	padding: 0.5rem;
	font-size: 14px;
	font-style: normal;
	font-weight: 400;
	line-height: 18px;
	letter-spacing: -0.07px;
	background: ${(props): string => (props.$isDarkMode ? '#0b0c0d' : '#fdfdfd')};
	${({ $isDragColumn }): string => ($isDragColumn ? 'cursor: col-resize;' : '')}

	${({ fontSize }): string =>
		fontSize === FontSize.SMALL
			? `font-size:11px; line-height:16px; padding: 0.1rem;`
			: fontSize === FontSize.MEDIUM
			? `font-size:13px; line-height:20px; padding:0.3rem;`
			: fontSize === FontSize.LARGE
			? `font-size:14px; line-height:24px; padding: 0.5rem;`
			: ``};
	${({ $isLogIndicator }): string => ($isLogIndicator ? 'padding: 0px; ' : '')}
	color: ${(props): string =>
		props.$isDarkMode ? 'var(--bg-vanilla-100, #fff)' : themeColors.bckgGrey};
`;
