import { themeColors } from 'constants/theme';
import { FontSize } from 'container/OptionsMenu/types';
import styled from 'styled-components';
import { getActiveLogBackground } from 'utils/logs';

interface TableHeaderCellStyledProps {
	$isDragColumn: boolean;
	$isDarkMode: boolean;
	$isLogIndicator?: boolean;
	$hasSingleColumn?: boolean;
	fontSize?: FontSize;
	columnKey?: string;
}

export const TableStyled = styled.table`
	width: 100%;
	border-collapse: separate;
	border-spacing: 0;
`;

/**
 * TanStack column sizing uses table-layout:fixed + colgroup widths; without clipping,
 * cell content overflows visually on top of neighbouring columns (overlap / "ghost" text).
 */
export const TanStackTableStyled = styled(TableStyled)`
	table-layout: fixed;
	width: 100%;
	min-width: 100%;
	max-width: 100%;

	& td,
	& th {
		overflow: hidden;
		min-width: 0;
		box-sizing: border-box;
		vertical-align: middle;
	}

	& td.table-actions-cell {
		overflow: visible;
	}

	& td.body {
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	/* Let nested body HTML / line-clamp shrink inside fixed columns */
	& td.body > * {
		min-width: 0;
		max-width: 100%;
	}

	/* Long column titles: ellipsis when wider than the column (TanStackHeaderRow) */
	& thead th .tanstack-header-title {
		min-width: 0;
		flex: 1 1 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	& thead th .tanstack-header-title > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}

	& td.logs-table-filler-cell,
	& th.logs-table-filler-header {
		padding: 0 !important;
		min-width: 0;
		border-left: none;
	}

	& th.logs-table-actions-header {
		position: sticky;
		right: 0;
		z-index: 2;
		width: 0 !important;
		min-width: 0 !important;
		max-width: 0 !important;
		padding: 0 !important;
		overflow: visible;
		white-space: nowrap;
		border-left: none;
	}
`;

const getTimestampColumnWidth = (
	columnKey?: string,
	$hasSingleColumn?: boolean,
): string =>
	columnKey === 'timestamp'
		? $hasSingleColumn
			? 'width: 100%;'
			: 'width: 10%;'
		: '';

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
		$isLogIndicator ? 'padding: 0 0 0 8px;width: 1%;' : ''}
	color: ${(props): string =>
		props.$isDarkMode ? themeColors.white : themeColors.bckgGrey};

	${({ columnKey, $hasSingleColumn }): string =>
		getTimestampColumnWidth(columnKey, $hasSingleColumn)}

	&.table-actions-cell {
		position: sticky;
		right: 0;
		z-index: 2;
		width: 0;
		min-width: 0;
		max-width: 0;
		padding: 0 !important;
		white-space: nowrap;
		overflow: visible;
		background-color: inherit;
	}
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
		display: flex;
		opacity: 0;
		pointer-events: none;
		transition: opacity 80ms linear;
	}

	&:hover {
		${TableCellStyled} {
			${({ $isDarkMode, $logType }): string =>
				getActiveLogBackground(true, $isDarkMode, $logType)}
		}
		.log-line-action-buttons {
			opacity: 1;
			pointer-events: auto;
		}
	}
	${({ $isActiveLog }): string =>
		$isActiveLog
			? `
		.log-line-action-buttons {
			opacity: 1;
			pointer-events: auto;
		}
	`
			: ''}
`;

export const TableHeaderCellStyled = styled.th<TableHeaderCellStyledProps>`
	padding: 0.5rem;
	height: 36px;
	text-align: left;
	font-size: 14px;
	font-style: normal;
	font-weight: 400;
	line-height: 18px;
	letter-spacing: -0.07px;
	background: ${(props): string => (props.$isDarkMode ? '#0b0c0d' : '#fdfdfd')};
	${({ $isDragColumn }): string => ($isDragColumn ? 'cursor: grab;' : '')}

	${({ fontSize }): string =>
		fontSize === FontSize.SMALL
			? `font-size:11px; line-height:16px; padding: 0.1rem;`
			: fontSize === FontSize.MEDIUM
			? `font-size:13px; line-height:20px; padding:0.3rem;`
			: fontSize === FontSize.LARGE
			? `font-size:14px; line-height:24px; padding: 0.5rem;`
			: ``};
	${({ $isLogIndicator }): string =>
		$isLogIndicator ? 'padding: 0px; width: 1%;' : ''}
	border-top: 1px solid var(--l2-border);
	border-bottom: 1px solid var(--l2-border);
	box-shadow: inset 0 -1px 0 var(--l2-border);
	&:first-child {
		border-left: 1px solid var(--l2-border);
	}
	color: ${(props): string =>
		props.$isDarkMode ? 'var(--bg-vanilla-100, #fff)' : themeColors.bckgGrey};

	${({ columnKey, $hasSingleColumn }): string =>
		getTimestampColumnWidth(columnKey, $hasSingleColumn)}
`;
