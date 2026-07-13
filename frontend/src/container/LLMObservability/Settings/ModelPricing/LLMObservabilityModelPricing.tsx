import { Tabs } from '@signozhq/ui/tabs';

import ModelCostTabPanel from './ModelCostTabPanel';
import styles from './LLMObservabilityModelPricing.module.scss';

function LLMObservabilityModelPricing(): JSX.Element {
	return (
		<div
			className={styles.llmObservabilityModelPricing}
			data-testid="llm-observability-model-pricing-page"
		>
			<Tabs
				// Model costs is the only enabled tab for now, so default to it. When
				// the unpriced-models tab lands in a later PR.
				defaultValue="model-costs"
				items={[
					{
						key: 'model-costs',
						label: 'Model costs',
						children: <ModelCostTabPanel />,
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
