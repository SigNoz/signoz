import styles from './AuditLogs.module.scss';
import { QueryBar } from './components/QueryBar';
import * as Sentry from '@sentry/react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { QuickFilters } from './components/QuickFilters';
import { useCallback, useEffect, useRef, useState } from 'react';
import RunQueryBtn from '@/container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { useQueryClient } from 'react-query';
import { useQueryBuilder } from '@/hooks/queryBuilder/useQueryBuilder';
import DateTimeSelectionV2 from '@/container/TopNav/DateTimeSelectionV2';

function AuditLogs(): JSX.Element {
	const [isLoadingQueries, setIsLoadingQueries] = useState<boolean>(false);
	const [_, setIsCancelled] = useState(false);

	const listAuditLogsKeyRef = useRef<any>();

	const { handleRunQuery } = useQueryBuilder();

	useEffect(() => {
		if (isLoadingQueries) {
			setIsCancelled(false);
		}
	}, [isLoadingQueries]);

	const queryClient = useQueryClient();
	const handleCancelQuery = useCallback(() => {
		if (listAuditLogsKeyRef.current) {
			queryClient.cancelQueries(listAuditLogsKeyRef.current);
		}
		setIsCancelled(true);
		// Reset loading state — the views container unmounts when cancelled, so
		// no child will call setIsLoadingQueries(false) otherwise.
		setIsLoadingQueries(false);
	}, [queryClient]);

	const onStageRunQuery = useCallback(() => {
		setIsCancelled(false);
		handleRunQuery();
	}, [handleRunQuery]);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={styles.auditLogsRoot} data-testid="audit-logs">
				<QuickFilters />
				<div className={styles.auditLogsRightPane}>
					<div className={styles.queryToolbar}>
						<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
						<RunQueryBtn
							isLoadingQueries={isLoadingQueries}
							handleCancelQuery={handleCancelQuery}
							onStageRunQuery={onStageRunQuery}
							testId="audit-logs-run-query-btn"
						/>
					</div>
					<QueryBar />
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default AuditLogs;
