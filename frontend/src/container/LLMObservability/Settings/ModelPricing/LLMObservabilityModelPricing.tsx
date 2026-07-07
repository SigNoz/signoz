import { Badge } from '@signozhq/ui/badge';
import { Tabs } from '@signozhq/ui/tabs';
import { useListUnmappedLLMModels } from 'api/generated/services/llmpricingrules';
import { parseAsStringEnum, useQueryState } from 'nuqs';

import { MODEL_COSTS_TAB, TAB_KEY, UNPRICED_MODELS_TAB } from './constants';
import styles from './LLMObservabilityModelPricing.module.scss';
import ModelCostTabPanel from './ModelCostTabPanel';
import UnpricedModelsTab from './UnpricedModelsTab';

function LLMObservabilityModelPricing(): JSX.Element {
	const [activeTab, setActiveTab] = useQueryState(
		TAB_KEY,
		parseAsStringEnum([MODEL_COSTS_TAB, UNPRICED_MODELS_TAB]).withDefault(
			MODEL_COSTS_TAB,
		),
	);

	// Count powers the tab badge; deduped with the tab's own fetch by react-query.
	const { data } = useListUnmappedLLMModels();
	const unpricedCount = data?.data?.items?.length ?? 0;

	return (
		<div
			className={styles.llmObservabilityModelPricing}
			data-testid="llm-observability-model-pricing-page"
		>
			<Tabs
				value={activeTab}
				onChange={(key): void => {
					void setActiveTab(key as typeof activeTab);
				}}
				items={[
					{
						key: MODEL_COSTS_TAB,
						label: 'Model costs',
						children: <ModelCostTabPanel />,
					},
					{
						key: UNPRICED_MODELS_TAB,
						label: (
							<span className={styles.tabLabel}>
								Unpriced models
								{unpricedCount > 0 && (
									<Badge
										variant="default"
										className={styles.tabBadge}
										data-testid="unpriced-models-count"
									>
										{unpricedCount}
									</Badge>
								)}
							</span>
						),
						children: <UnpricedModelsTab />,
					},
				]}
			/>
		</div>
	);
}

export default LLMObservabilityModelPricing;
