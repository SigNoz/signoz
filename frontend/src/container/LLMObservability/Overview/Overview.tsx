import styles from './Overview.module.scss';

// Overview tab content for LLM Observability. Currently the feature's landing
// surface; usage/cost/performance widgets land in later PRs.
function Overview(): JSX.Element {
	return (
		<div className={styles.overview} data-testid="llm-observability-overview">
			<header className={styles.pageHeader}>
				<div className={styles.pageHeaderTitle}>
					<h1 className={styles.title}>LLM Observability</h1>
					<p className={styles.subtitle}>
						Monitor and analyze your LLM usage, costs, and performance
					</p>
				</div>
			</header>
		</div>
	);
}

export default Overview;
