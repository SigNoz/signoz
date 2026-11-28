import styles from './AuditLogs.module.scss';
import { FilterExpandButton } from './components/FilterExpandButton';
import { OptionsMenu } from './components/OptionsMenu';
import { OrderBy } from './components/OrderBy';
import { QueryBar } from './components/QueryBar';
import * as Sentry from '@sentry/react';
import QueryCancelledPlaceholder from 'components/QueryCancelledPlaceholder';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useEffect, useRef, useState } from 'react';
import RunQueryBtn from '@/container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { useQueryClient } from 'react-query';
import { useQueryBuilder } from '@/hooks/queryBuilder/useQueryBuilder';
import DateTimeSelectionV2 from '@/container/TopNav/DateTimeSelectionV2';
import { QueryResults } from './components/QueryResults';
import { useAuditLogsQuery } from './hooks/useAuditLogsQuery';
import { useAuditLogsOptionsStore } from './hooks/useAuditLogsOptionsStore';
import QuickFiltersLayout from '@/components/QuickFilters/QuickFiltersLayout/QuickFiltersLayout';
import { QuickFiltersSource } from '@/components/QuickFilters/types';
import { SavedviewtypesSourceDTO } from '@/api/generated/services/sigNoz.schemas';
import { useSignalFieldApis } from '@/components/QuickFilters/hooks/useSignalFieldApis';

function AuditLogs(): JSX.Element {
	const [isCancelled, setIsCancelled] = useState(false);

	const { quickFilterCollapsed, setQuickFilterCollapsed } =
		useAuditLogsOptionsStore();

	const listAuditLogsKeyRef = useRef<any>();

	const { handleRunQuery } = useQueryBuilder();

	const { logs, isLoading, isFetching, isError, error, onEndReached } =
		useAuditLogsQuery({ listAuditLogsKeyRef });

	useEffect(() => {
		if (isFetching) {
			setIsCancelled(false);
		}
	}, [isFetching]);

	const queryClient = useQueryClient();
	const handleCancelQuery = useCallback(() => {
		if (listAuditLogsKeyRef.current) {
			queryClient.cancelQueries(listAuditLogsKeyRef.current);
		}
		setIsCancelled(true);
	}, [queryClient]);

	const onStageRunQuery = useCallback(() => {
		setIsCancelled(false);
		handleRunQuery();
	}, [handleRunQuery]);

	const quickFilterFieldApis = useSignalFieldApis();

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={styles.auditLogsRoot} data-testid="audit-logs">
				<QuickFiltersLayout
					showFilters={!quickFilterCollapsed}
					onToggleFilters={() => setQuickFilterCollapsed(!quickFilterCollapsed)}
					savedViewProps={{ source: SavedviewtypesSourceDTO.audit }}
					quickFilterProps={{
						quickFilterSource: QuickFiltersSource.AUDIT_LOGS,
						useFieldApis: quickFilterFieldApis,
					}}
				>
					<div className={styles.auditLogsRightPane}>
						<div className={styles.queryToolbar}>
							<div className={styles.queryToolbarLeft}>
								{quickFilterCollapsed && (
									<FilterExpandButton
										onClick={(): void => setQuickFilterCollapsed(!quickFilterCollapsed)}
									/>
								)}
							</div>
							<div className={styles.queryToolbarRight}>
								<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
								<RunQueryBtn
									isLoadingQueries={isFetching}
									handleCancelQuery={handleCancelQuery}
									onStageRunQuery={onStageRunQuery}
									testId="audit-logs-run-query-btn"
								/>
							</div>
						</div>
						<QueryBar />
						<div className={styles.actionsRow}>
							<OrderBy />
							<OptionsMenu />
						</div>
						{isCancelled ? (
							<QueryCancelledPlaceholder subText='Click "Run Query" to load audit logs.' />
						) : (
							<QueryResults
								logs={logs}
								isLoading={isLoading}
								isFetching={isFetching}
								isError={isError}
								error={error}
								onEndReached={onEndReached}
							/>
						)}
					</div>
				</QuickFiltersLayout>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default AuditLogs;
