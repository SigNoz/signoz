import styles from './ReasonColumnTooltip.module.scss';

export interface ReasonColumnTooltipContentProps {
	description?: string;
	summary?: string;
}

export function ReasonColumnTooltipContent({
	summary,
	description,
}: ReasonColumnTooltipContentProps): JSX.Element {
	return (
		<div className={styles.tooltipContent}>
			{summary && (
				<div className={styles.section}>
					<span className={styles.label}>Summary</span>
					<span className={styles.value}>{summary}</span>
				</div>
			)}
			{description && (
				<div className={styles.section}>
					<span className={styles.label}>Description</span>
					<span className={styles.value}>{description}</span>
				</div>
			)}
			{!summary && !description && (
				<div className={styles.section}>
					<span className={styles.label}>About</span>
					<span className={styles.value}>No reason details for this alert.</span>
				</div>
			)}
		</div>
	);
}
