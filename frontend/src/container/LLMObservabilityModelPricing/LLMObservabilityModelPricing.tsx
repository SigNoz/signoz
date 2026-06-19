import styles from './LLMObservabilityModelPricing.module.scss';

function LLMObservabilityModelPricing(): JSX.Element {
	return (
		<div
			className={styles.llmObservabilityModelPricing}
			data-testid="llm-observability-model-pricing-page"
		>
			<header className={styles.pageHeader}>
				<div className={styles.pageHeaderTitle}>
					<h1>Configuration</h1>
					<p>Model pricing and cost estimation settings</p>
				</div>
			</header>
		</div>
	);
}

export default LLMObservabilityModelPricing;
