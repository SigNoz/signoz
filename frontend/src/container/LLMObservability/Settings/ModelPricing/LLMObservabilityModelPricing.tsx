import { Badge } from '@signozhq/ui/badge';
import { Tabs } from '@signozhq/ui/tabs';
import { useListUnmappedLLMModels } from 'api/generated/services/llmpricingrules';
import { parseAsStringEnum, useQueryState } from 'nuqs';

import { MODEL_COSTS_TAB, TAB_KEY, UNPRICED_MODELS_TAB } from './constants';
import styles from './LLMObservabilityModelPricing.module.scss';
import ModelCostsTab from './ModelCostsTab';
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
	const unpricedCount = data?.data?.total ?? 0;

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

			<Tabs
				value={activeTab}
				onChange={(key): void => {
					void setActiveTab(key as typeof activeTab);
				}}
				items={[
					{
						key: MODEL_COSTS_TAB,
						label: 'Model costs',
						children: <ModelCostsTab />,
					},
					{
						key: UNPRICED_MODELS_TAB,
						label: (
							<span className={styles.tabLabel}>
								Unpriced models
								{unpricedCount > 0 && (
									<Badge
										color="cherry"
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
