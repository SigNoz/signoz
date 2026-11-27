import { Typography } from '@signozhq/ui/typography';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import APIError from 'types/api/error';
import TanStackTable from 'components/TanStackTableView';

import { AuditLog } from '../AuditLogs.types';

import styles from './QueryResults.module.scss';
import { useAuditLogColumns } from '../hooks/useAuditLogColumns';

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

	const showLoading = isLoading || (isFetching && logs.length === 0);
	const showError = !showLoading && isError && !!error;
	const showEmpty = !showLoading && !showError && logs.length === 0;
	const showTable = !showLoading && !showError && logs.length > 0;

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
						className={styles.auditLogsTable}
						testId="audit-logs-table"
						columns={columns}
						data={logs}
						isLoading={isFetching}
						getRowKey={(log): string => log.id}
						onEndReached={onEndReached}
						cellTypographySize={fontSize}
						plainTextCellLineClamp={1}
					/>
				</div>
			)}
		</div>
	);
}
