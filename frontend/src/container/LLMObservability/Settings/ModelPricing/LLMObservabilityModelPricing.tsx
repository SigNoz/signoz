import styles from './LLMObservabilityModelPricing.module.scss';

function LLMObservabilityModelPricing(): JSX.Element {
	return (
		<div
			className={styles.llmObservabilityModelPricing}
			data-testid="llm-observability-model-pricing-page"
		>
			<header className={styles.pageHeader}>
				<div className={styles.pageHeaderTitle}>
					<h1 className={styles.title}>Configuration</h1>
					<p className={styles.subtitle}>
						Model pricing and cost estimation settings
					</p>
				</div>
			</header>
		</div>
	);
}

export default LLMObservabilityModelPricing;
