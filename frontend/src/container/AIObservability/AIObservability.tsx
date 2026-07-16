import { Tabs } from '@signozhq/ui/tabs';

import { useAIObservabilityTabs } from './hooks/useAIObservabilityTabs';
import styles from './AIObservability.module.scss';

// Shell for the AI Observability page: renders the top-level tab bar
// (Overview / Configuration) using the SigNoz design-system Tabs, with
// route-driven active state from useAIObservabilityTabs.
function AIObservability(): JSX.Element {
	const { items, activeTab, onTabChange } = useAIObservabilityTabs();

	return (
		<div className={styles.aiObservability} data-testid="ai-observability-page">
			<Tabs
				items={items}
				value={activeTab}
				onChange={onTabChange}
				testId="ai-observability-tabs"
			/>
		</div>
	);
}

export default AIObservability;
