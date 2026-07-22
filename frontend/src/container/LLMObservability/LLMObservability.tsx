import { Tabs } from '@signozhq/ui/tabs';

import { useLLMObservabilityTabs } from './hooks/useLLMObservabilityTabs';
import styles from './LLMObservability.module.scss';

// Shell for the LLM Observability page: renders the top-level tab bar
// (Overview / Configuration) using the SigNoz design-system Tabs, with
// route-driven active state from useLLMObservabilityTabs.
function LLMObservability(): JSX.Element {
	const { items, activeTab, onTabChange } = useLLMObservabilityTabs();

	return (
		<div className={styles.llmObservability} data-testid="llm-observability-page">
			<Tabs
				items={items}
				value={activeTab}
				onChange={onTabChange}
				testId="llm-observability-tabs"
			/>
		</div>
	);
}

export default LLMObservability;
