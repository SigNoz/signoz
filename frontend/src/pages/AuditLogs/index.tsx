import styles from './AuditLogs.module.scss';
import { QueryBar } from './components/QueryBar';
import { QuickFilters } from './components/QuickFilters';

function AuditLogs(): JSX.Element {
	return (
		<div className={styles.auditLogsRoot} data-testid="audit-logs">
			<QuickFilters />
			<div className={styles.auditLogsRightPane}>
				<QueryBar />
			</div>
		</div>
	);
}

export default AuditLogs;
