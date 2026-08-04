import { Tabs } from '@signozhq/ui/tabs';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import ROUTES from 'constants/routes';

import { useLLMObservabilityTabs } from './hooks/useLLMObservabilityTabs';
import styles from './LLMObservability.module.scss';

// Shell for the LLM Observability page: renders the top-level tab bar
// (Overview / Explorer / Model pricing / Attribute Mapping) using the SigNoz
// design-system Tabs, with route-driven active state from
// useLLMObservabilityTabs.
function LLMObservability(): JSX.Element {
	const { items, activeTab, onTabChange } = useLLMObservabilityTabs();

	// The Explorer carries its own time picker, so the global TopNav — which also
	// hosts share/feedback — is suppressed on that route. Re-hosting the header
	// actions on the tab bar keeps them reachable, and mirrors how the traces
	// module page renders them alongside its tabs.
	const showHeaderActions = activeTab === ROUTES.AI_OBSERVABILITY_EXPLORER;

	return (
		<div className={styles.llmObservability} data-testid="llm-observability-page">
			<div className={styles.tabBar}>
				<Tabs
					items={items}
					value={activeTab}
					onChange={onTabChange}
					testId="llm-observability-tabs"
				/>
				{showHeaderActions && (
					<div className={styles.headerActions}>
						<HeaderRightSection
							enableShare
							enableFeedback
							enableAnnouncements={false}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

export default LLMObservability;
