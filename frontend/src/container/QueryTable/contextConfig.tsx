import { ColumnType } from 'antd/lib/table';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ReactNode } from 'react';

export type ContextMenuItem = ReactNode;

interface ClickedData {
	record: RowData;
	column: ColumnType<RowData>;
}

interface ColumnClickData {
	record: RowData;
	column: ColumnType<RowData>;
}

export function getContextMenuConfig(
	clickedData: ClickedData | null,
	panelType: string,
	onColumnClick: (operator: string, data: ColumnClickData) => void,
): { header?: string; items?: ContextMenuItem } {
	if (
		panelType === 'table' &&
		clickedData?.column &&
		!(clickedData.column as any).queryName
	) {
		const columnName = clickedData.column.title || clickedData.column.dataIndex;
		return {
			header: `Filter by ${columnName}`,
			items: (
				<>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							padding: '8px 16px',
							cursor: 'pointer',
						}}
						onClick={(): void =>
							onColumnClick('=', {
								record: clickedData.record,
								column: clickedData.column,
							})
						}
						onKeyDown={(e): void => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onColumnClick('=', {
									record: clickedData.record,
									column: clickedData.column,
								});
							}
						}}
						role="button"
						tabIndex={0}
					>
						<span style={{ color: '#3B5AFB', fontSize: 18 }}>=</span>
						<span style={{ fontWeight: 600, color: '#2B2B43' }}>Is this</span>
					</div>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							padding: '8px 16px',
							cursor: 'pointer',
						}}
						onClick={(): void =>
							onColumnClick('!=', {
								record: clickedData.record,
								column: clickedData.column,
							})
						}
						onKeyDown={(e): void => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onColumnClick('!=', {
									record: clickedData.record,
									column: clickedData.column,
								});
							}
						}}
						role="button"
						tabIndex={0}
					>
						<span style={{ color: '#3B5AFB', fontSize: 18 }}>≠</span>
						<span style={{ fontWeight: 600, color: '#2B2B43' }}>Is not this</span>
					</div>
				</>
			),
		};
	}
	return {};
}
