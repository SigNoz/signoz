import { useCallback, useMemo, useState } from 'react';
import TanStackTable, {
	SortState,
	TableColumnDef,
} from 'components/TanStackTableView';

import type { Alert } from '../types';
import { sortAlerts } from '../utils';
import styles from './ExpandedAlertsTable.module.scss';

const EXPANDED_PAGE_SIZE = 5;

interface ExpandedAlertsTableProps {
	alerts: Alert[];
	columns: TableColumnDef<Alert>[];
	onRowClick: (alert: Alert) => void;
	onRowClickNewTab: (alert: Alert) => void;
	isLoading?: boolean;
}

function ExpandedAlertsTable({
	alerts,
	columns,
	onRowClick,
	onRowClickNewTab,
	isLoading,
}: ExpandedAlertsTableProps): JSX.Element {
	const [page, setPage] = useState(1);
	const [orderBy, setOrderBy] = useState<SortState | null>(null);

	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage);
	}, []);

	const handleSort = useCallback((sort: SortState | null) => {
		setOrderBy(sort);
		setPage(1);
	}, []);

	const sortedAlerts = useMemo(
		() => sortAlerts(alerts, orderBy),
		[alerts, orderBy],
	);

	const paginatedAlerts = useMemo(() => {
		const start = (page - 1) * EXPANDED_PAGE_SIZE;
		return sortedAlerts.slice(start, start + EXPANDED_PAGE_SIZE);
	}, [sortedAlerts, page]);

	return (
		<div
			className={styles.expandedRowContainer}
			data-has-page={alerts.length > EXPANDED_PAGE_SIZE}
		>
			<TanStackTable<Alert>
				className={styles.expandedTable}
				data={paginatedAlerts}
				columns={columns}
				isLoading={isLoading}
				getRowKey={(row): string => row.fingerprint ?? ''}
				getItemKey={(row): string => row.fingerprint ?? ''}
				onRowClick={onRowClick}
				onRowClickNewTab={onRowClickNewTab}
				onSort={handleSort}
				disableVirtualScroll
				pagination={{
					total: alerts.length,
					defaultPage: page,
					defaultLimit: EXPANDED_PAGE_SIZE,
					showTotalCount: true,
					totalCountLabel: 'Alerts',
					showPageSize: false,
					onPageChange: handlePageChange,
				}}
				paginationClassname={styles.expandedPagination}
				enableAlternatingRowColors
				plainTextCellLineClamp={2}
			/>
		</div>
	);
}

export default ExpandedAlertsTable;
