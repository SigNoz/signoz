import { themeColors } from 'constants/theme';
import styled from 'styled-components';
import { getActiveLogBackground } from 'utils/logs';

interface TableHeaderCellStyledProps {
	$isDragColumn: boolean;
	$isDarkMode: boolean;
}

export const TableStyled = styled.table`
	width: 100%;
	border-top: 1px solid rgba(253, 253, 253, 0.12);
	border-radius: 2px 2px 0 0;
	border-collapse: separate;
	border-spacing: 0;
	border-inline-start: 1px solid rgba(253, 253, 253, 0.12);
	border-inline-end: 1px solid rgba(253, 253, 253, 0.12);
`;

export const TableCellStyled = styled.td<TableHeaderCellStyledProps>`
	padding: 0.5rem;
	border-inline-end: 1px solid rgba(253, 253, 253, 0.12);
	border-top: 1px solid rgba(253, 253, 253, 0.12);
	background-color: ${(props): string =>
		props.$isDarkMode ? themeColors.black : themeColors.whiteCream};

	color: ${(props): string =>
		props.$isDarkMode ? themeColors.white : themeColors.bckgGrey};
`;

export const TableRowStyled = styled.tr<{
	$isActiveLog: boolean;
	$isDarkMode: boolean;
}>`
	td {
		${({ $isActiveLog }): string => getActiveLogBackground($isActiveLog)}
	}

	&:hover {
		${TableCellStyled} {
			${({ $isActiveLog, $isDarkMode }): string =>
				$isActiveLog
					? getActiveLogBackground()
					: `background-color: ${
							!$isDarkMode ? themeColors.lightgrey : themeColors.bckgGrey
					  };`}
		}
	}
`;

export const TableHeaderCellStyled = styled.th<TableHeaderCellStyledProps>`
	padding: 0.5rem;
	border-inline-end: 1px solid rgba(253, 253, 253, 0.12);
	background-color: ${(props): string =>
		!props.$isDarkMode ? themeColors.whiteCream : themeColors.bckgGrey};

	${({ $isDragColumn }): string => ($isDragColumn ? 'cursor: col-resize;' : '')}

	color: ${(props): string =>
		props.$isDarkMode ? themeColors.white : themeColors.bckgGrey};

	&:first-child {
		border-start-start-radius: 2px;
	}
	&:last-child {
		border-start-end-radius: 2px;
		border-inline-end: none;
	}
`;
