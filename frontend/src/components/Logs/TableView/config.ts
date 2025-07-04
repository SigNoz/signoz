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
	body: { weight: 2 }, // Gets 2x the base width
	expand: { width: 'auto' },
} as const;

export function getColumnWidth(
	columnKey: string,
	allColumns: ColumnsType<Record<string, unknown>>,
	tableWidth?: number,
): string {
	if (!tableWidth) {
		return '';
	}

	// Calculate dynamic widths
	const fixedColumns = ['state-indicator', 'timestamp'];
	const fixedWidth =
		20 + (allColumns.some((col) => col.key === 'timestamp') ? 150 : 0) + 35; // 20px - state-indicator + 150px - timestamp + 35px - actions
	const remainingWidth = tableWidth - fixedWidth;

	// Get columns that need dynamic width calculation
	const dynamicColumns = allColumns.filter(
		(col) => col.key && !fixedColumns.includes(col.key as string),
	);

	// Return fixed width for specific columns
	const config = COLUMN_CONFIG[columnKey];
	if (config && 'width' in config) {
		if (columnKey === 'timestamp' && dynamicColumns.length === 0) {
			return `${remainingWidth + 150}px`; // 150px (timestamp width) + remaining width
		}
		return config.width;
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
		return `${baseWidth * 2}px`;
	}

	return `${baseWidth}px`;
}
