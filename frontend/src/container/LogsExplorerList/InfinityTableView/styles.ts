import { Color } from '@signozhq/design-tokens';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';
import { getActiveLogBackground } from 'utils/logs';

interface TableHeaderCellStyledProps {
	$isDragColumn: boolean;
	$isDarkMode: boolean;
	$isTimestamp?: boolean;
}

export const TableStyled = styled.table`
	width: 100%;
`;

export const TableCellStyled = styled.td<TableHeaderCellStyledProps>`
	padding: 0.5rem;
	background-color: ${(props): string =>
		props.$isDarkMode ? 'inherit' : themeColors.whiteCream};

	color: ${(props): string =>
		props.$isDarkMode ? themeColors.white : themeColors.bckgGrey};
`;

// handle the light theme here
export const TableRowStyled = styled.tr<{
	$isActiveLog: boolean;
	$isDarkMode: boolean;
}>`
	td {
		${({ $isActiveLog, $isDarkMode }): string =>
			$isActiveLog
				? `background-color: ${
						$isDarkMode ? Color.BG_SLATE_500 : Color.BG_VANILLA_300
				  } !important`
				: ''}
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
	${({ $isTimestamp }): string => ($isTimestamp ? 'padding-left: 24px;' : '')}
	${({ $isDragColumn }): string => ($isDragColumn ? 'cursor: col-resize;' : '')}

	color: ${(props): string =>
		props.$isDarkMode ? 'var(--bg-vanilla-100, #fff)' : themeColors.bckgGrey};
`;
