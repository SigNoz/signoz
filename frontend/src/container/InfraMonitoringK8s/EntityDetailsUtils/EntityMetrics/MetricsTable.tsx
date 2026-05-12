import { useCallback, useMemo, useState } from 'react';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { SortState } from 'components/TanStackTableView/types';

import styles from './MetricsTable.module.scss';
import { MetricsColumn } from './utils';

interface MetricsTableProps {
	rows: Record<string, string>[];
	columns: MetricsColumn[];
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 7; // the sweetspot for the amount of items without showing the scrollbar

export function MetricsTable({
	rows,
	columns,
}: MetricsTableProps): JSX.Element {
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [limit, setLimit] = useState(DEFAULT_LIMIT);
	const [orderBy, setOrderBy] = useState<SortState | null>(null);

	const sortedRows = useMemo(() => {
		if (!orderBy) {
			return rows;
		}
		const { columnName, order } = orderBy;
		return [...rows].sort((a, b) => {
			const aVal = parseFloat(a[columnName]) || 0;
			const bVal = parseFloat(b[columnName]) || 0;
			return order === 'asc' ? aVal - bVal : bVal - aVal;
		});
	}, [rows, orderBy]);

	const paginatedRows = useMemo(() => {
		const startIndex = (page - 1) * limit;
		return sortedRows.slice(startIndex, startIndex + limit);
	}, [sortedRows, page, limit]);

	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage);
	}, []);

	const handleLimitChange = useCallback((newLimit: number) => {
		setLimit(newLimit);
		setPage(DEFAULT_PAGE);
	}, []);

	const columnDefs = useMemo(
		() =>
			columns.map(
				(col, index) =>
					({
						id: col.key,
						accessorKey: col.key as keyof Record<string, string>,
						header: (): JSX.Element => (
							<TanStackTable.Text title={col.label}>{col.label}</TanStackTable.Text>
						),
						cell: ({ value }): JSX.Element => {
							const displayValue = String(value ?? '');
							return (
								<TanStackTable.Text title={displayValue}>
									{displayValue}
								</TanStackTable.Text>
							);
						},
						enableMove: false,
						enableResize: false,
						enableRemove: false,
						enableSort: col.isValueColumn,
						width: { min: index === 0 ? 220 : col.label?.length * 12 || 100 },
					}) satisfies TableColumnDef<Record<string, string>>,
			),
		[columns],
	);

	return (
		<TanStackTable<Record<string, string>>
			className={styles.table}
			data={paginatedRows}
			columns={columnDefs}
			onSort={setOrderBy}
			pagination={{
				total: rows.length,
				defaultPage: page,
				defaultLimit: limit,
				onPageChange: handlePageChange,
				onLimitChange: handleLimitChange,
				showPageSize: false,
			}}
			paginationClassname={styles.paginationContainer}
			getRowKey={(row) => row.key}
			getItemKey={(row) => row.key}
		/>
	);
}
