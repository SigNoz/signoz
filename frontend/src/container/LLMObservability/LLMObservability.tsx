import styles from './LLMObservability.module.scss';

function LLMObservability(): JSX.Element {
	return (
		<div className={styles.llmObservability} data-testid="llm-observability-page">
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

export default LLMObservability;
