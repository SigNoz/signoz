import { themeColors } from 'constants/theme';
import styled from 'styled-components';
import { getActiveLogBackground } from 'utils/logs';

interface TableHeaderCellStyledProps {
	isDragColumn: boolean;
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

export const TableCellStyled = styled.td`
	padding: 0.5rem;
	border-inline-end: 1px solid rgba(253, 253, 253, 0.12);
	border-top: 1px solid rgba(253, 253, 253, 0.12);
	background-color: ${themeColors.lightBlack};
`;

export const TableRowStyled = styled.tr<{
	$isActiveLog: boolean;
}>`
	td {
		${({ $isActiveLog }): string => getActiveLogBackground($isActiveLog)}
	}

	&:hover {
		${TableCellStyled} {
			${({ $isActiveLog }): string =>
				$isActiveLog
					? getActiveLogBackground()
					: `background-color: ${themeColors.bckgGrey};`}
		}
	}
`;

export const TableHeaderCellStyled = styled.th<TableHeaderCellStyledProps>`
	padding: 0.5rem;
	border-inline-end: 1px solid rgba(253, 253, 253, 0.12);
	background-color: ${themeColors.bckgGrey};
	${({ isDragColumn }): string => (isDragColumn ? 'cursor: col-resize;' : '')}

	&:first-child {
		border-start-start-radius: 2px;
	}
	&:last-child {
		border-start-end-radius: 2px;
		border-inline-end: none;
	}
`;
