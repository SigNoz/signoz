import styles from './AuditLogs.module.scss';
import { QueryBar } from './components/QueryBar';
import * as Sentry from '@sentry/react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { QuickFilters } from './components/QuickFilters';

function AuditLogs(): JSX.Element {
	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={styles.auditLogsRoot} data-testid="audit-logs">
				<QuickFilters />
				<div className={styles.auditLogsRightPane}>
					<QueryBar />
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default AuditLogs;
