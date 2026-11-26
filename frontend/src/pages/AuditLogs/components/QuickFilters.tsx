import styles from './QuickFilters.module.scss';

export function QuickFilters(): JSX.Element {
	return (
		<div className={styles.quickFilters} data-testid="audit-logs-quick-filters" />
	);
}
