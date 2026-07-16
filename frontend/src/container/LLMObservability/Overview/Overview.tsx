import PrebuiltDashboard from './PrebuiltDashboard/PrebuiltDashboard';
import styles from './Overview.module.scss';

// Overview tab content for LLM Observability. Renders the prebuilt AI Observability
// dashboard (cost, tokens, latency, errors, tool-call RED, TTFT) read-only via
// GridCard, following the Cost Meter breakdown pattern.
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
			<PrebuiltDashboard />
		</div>
	);
}

export default Overview;
