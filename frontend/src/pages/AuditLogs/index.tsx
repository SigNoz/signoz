import styles from './AuditLogs.module.scss';

function AuditLogs(): JSX.Element {
	return <div className={styles.auditLogsRoot} data-testid="audit-logs" />;
}

export default AuditLogs;
