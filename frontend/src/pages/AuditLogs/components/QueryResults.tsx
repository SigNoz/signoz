import { CSSProperties, useRef } from 'react';
import { Typography } from '@signozhq/ui/typography';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { useIsDarkMode } from 'hooks/useDarkMode';
import APIError from 'types/api/error';
import TanStackTable, {
	TanStackTableHandle,
} from 'components/TanStackTableView';

import { AuditLog } from '../AuditLogs.types';
import { getRowHoverColor } from '../AuditLogs.utils';

import styles from './QueryResults.module.scss';
import { useAuditLogColumns } from '../hooks/useAuditLogColumns';
import { useAuditLogDetail } from '../hooks/useAuditLogDetail';
import { DetailsDrawer } from './DetailsDrawer';
import useScrollToLog from '@/hooks/logs/useScrollToLog';

interface QueryResultsProps {
	logs: AuditLog[];
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error: Error | null;
	onEndReached: () => void;
}

export function QueryResults({
	logs,
	isLoading,
	isFetching,
	isError,
	error,
	onEndReached,
}: QueryResultsProps): JSX.Element {
	const { columns, fontSize } = useAuditLogColumns();
	const isDarkMode = useIsDarkMode();

	const ref = useRef<TanStackTableHandle>(null);

	const { activeLog, handleSetActiveLog, handleCloseLogDetail } =
		useAuditLogDetail();

	const showLoading = isLoading || (isFetching && logs.length === 0);
	const showError = !showLoading && isError && !!error;
	const showEmpty = !showLoading && !showError && logs.length === 0;
	const showTable = !showLoading && !showError && logs.length > 0;

	const handleScrollToLog = useScrollToLog({ logs, virtuosoRef: ref });

	return (
		<div className={styles.container}>
			{showLoading && <LogsLoading />}

			{showError && <ErrorInPlace error={error as APIError} />}

			{showEmpty && (
				<div className={styles.empty} data-testid="audit-logs-empty">
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="p"
						align="center"
						textOverflow="wrap"
					>
						No audit logs found for this query.
					</Typography>
				</div>
			)}

			{showTable && (
				<div className={styles.results} data-testid="audit-logs-results">
					<TanStackTable<AuditLog>
						ref={ref}
						className={styles.auditLogsTable}
						testId="audit-logs-table"
						columns={columns}
						data={logs}
						isLoading={isFetching}
						getRowKey={(log): string => log.id}
						getRowStyle={(log): CSSProperties =>
							({
								'--row-active-bg': getRowHoverColor(isDarkMode, log),
								'--row-hover-bg': getRowHoverColor(isDarkMode, log),
							}) as CSSProperties
						}
						onEndReached={onEndReached}
						isRowActive={(log): boolean => log.id === activeLog?.id}
						cellTypographySize={fontSize}
						plainTextCellLineClamp={1}
						onRowClick={(log, _, { isActive }) => {
							if (isActive) {
								handleCloseLogDetail();
								return;
							}
							handleSetActiveLog(log);
						}}
					/>
				</div>
			)}
			<DetailsDrawer
				logs={logs}
				activeLog={activeLog}
				handleCloseLogDetail={handleCloseLogDetail}
				handleSetActiveLog={handleSetActiveLog}
				onScrollToLog={handleScrollToLog}
			/>
		</div>
	);
}
