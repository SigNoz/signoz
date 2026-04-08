import styles from './K8sEmptyState.module.scss';

export function K8sEmptyState(): JSX.Element {
	return (
		<div className={styles.noFilteredHostsMessageContainer}>
			<div className={styles.noFilteredHostsMessageContent}>
				<img
					src="/Icons/emptyState.svg"
					alt="thinking-emoji"
					className={styles.emptyStateSvg}
				/>

				<p className={styles.noFilteredHostsMessage}>
					This query had no results. Edit your query and try again!
				</p>
			</div>
		</div>
	);
}
