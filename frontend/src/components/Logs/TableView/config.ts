import { TableProps } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { CSSProperties } from 'react';

export function getDefaultCellStyle(isDarkMode?: boolean): CSSProperties {
	return {
		paddingTop: 4,
		paddingBottom: 6,
		paddingRight: 8,
		paddingLeft: 8,
		color: isDarkMode ? 'var(--bg-vanilla-400)' : 'var(--bg-slate-400)',
		fontSize: '14px',
		fontStyle: 'normal',
		fontWeight: 400,
		lineHeight: '18px',
		letterSpacing: '-0.07px',
		marginBottom: '0px',
		minWidth: '10rem',
	};
}

export const defaultListViewPanelStyle: CSSProperties = {
	maxWidth: '40rem',
};

export const tableScroll: TableProps<Record<string, unknown>>['scroll'] = {
	x: true,
};

// Column width configuration
type ColumnConfig = { width: string; fixed?: boolean } | { weight: number };

const COLUMN_CONFIG: Record<string, ColumnConfig> = {
	'state-indicator': { width: '20px', fixed: true },
	timestamp: { width: '150px', fixed: true },
} as const;

// Constants for fixed column widths
const COLUMN_WIDTHS = {
	STATE_INDICATOR: 20,
	TIMESTAMP: 150,
	ACTIONS: 35,
} as const;

/**
 * Calculates the width of a column based on table width and column configuration
 * @param columnKey - The key of the column to calculate width for
 * @param allColumns - Array of all table columns
 * @param tableWidth - Total width of the table container
 * @returns CSS width string (e.g., "150px")
 */
export function getColumnWidth(
	columnKey: string,
	allColumns: ColumnsType<Record<string, unknown>>,
	tableWidth?: number,
): CSSProperties {
	if (!tableWidth) {
		return {};
	}

	const fixedColumns = ['state-indicator', 'timestamp'];
	const fixedWidth =
		COLUMN_WIDTHS.STATE_INDICATOR +
		(allColumns.some((col) => col.key === 'timestamp')
			? COLUMN_WIDTHS.TIMESTAMP
			: 0) +
		COLUMN_WIDTHS.ACTIONS;

	const remainingWidth = tableWidth - fixedWidth;

	// Get columns that need dynamic width calculation
	const dynamicColumns = allColumns.filter(
		(col) => col.key && !fixedColumns.includes(col.key as string),
	);

	// Return fixed width for specific columns
	const config = COLUMN_CONFIG[columnKey];
	if (config && 'width' in config) {
		if (columnKey === 'timestamp' && dynamicColumns.length === 0) {
			return { width: `${remainingWidth + COLUMN_WIDTHS.TIMESTAMP}px` }; // 150px (timestamp width) + remaining width
		}
		return { width: config.width };
	}

	// Calculate total weight (body gets 2x weight)
	const totalWeight = dynamicColumns.reduce(
		(sum, col) => sum + (col.key === 'body' ? 2 : 1),
		0,
	);

	// Calculate base width per weight unit
	const baseWidth = remainingWidth / totalWeight;

	// Return width based on column type
	if (columnKey === 'body') {
		return { width: `${baseWidth * 2}px` };
	}

	return { width: `${baseWidth}px` };
}
