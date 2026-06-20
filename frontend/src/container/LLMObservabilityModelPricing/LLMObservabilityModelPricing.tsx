import { Tabs } from '@signozhq/ui/tabs';

import ModelCostsTab from './ModelCostsTab';
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

			<Tabs
				// Model costs is the only enabled tab for now, so default to it. When
				// the unpriced-models tab lands, this can become a URL-backed param.
				defaultValue="model-costs"
				items={[
					{
						key: 'model-costs',
						label: 'Model costs',
						children: <ModelCostsTab />,
					},
					{
						// Unpriced-models tab lands in a later PR.
						key: 'unpriced-models',
						label: 'Unpriced models',
						disabled: true,
						children: null,
					},
				]}
			/>
		</div>
	);
}

export default LLMObservabilityModelPricing;
