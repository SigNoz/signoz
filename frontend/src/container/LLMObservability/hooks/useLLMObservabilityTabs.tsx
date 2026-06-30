import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { type TabItemProps } from '@signozhq/ui/tabs';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import Overview from '../Overview/Overview';
import LLMObservabilityModelPricing from '../Settings/ModelPricing/LLMObservabilityModelPricing';

const OVERVIEW_KEY = ROUTES.LLM_OBSERVABILITY_OVERVIEW;
const CONFIGURATION_KEY = ROUTES.LLM_OBSERVABILITY_CONFIGURATION;

interface UseLLMObservabilityTabsResult {
	items: TabItemProps[];
	activeTab: string;
	onTabChange: (key: string) => void;
}

// Drives the top-level LLM Observability tabs. Route-driven: the active tab is
// derived from the pathname (each tab owns a URL) and changing tabs navigates,
// so tabs stay shareable/back-button friendly while rendering with the SigNoz
// design-system Tabs.
export function useLLMObservabilityTabs(): UseLLMObservabilityTabsResult {
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const activeTab = pathname.startsWith(CONFIGURATION_KEY)
		? CONFIGURATION_KEY
		: OVERVIEW_KEY;

	const onTabChange = useCallback(
		(key: string): void => {
			safeNavigate(key);
		},
		[safeNavigate],
	);

	const items: TabItemProps[] = [
		{
			key: OVERVIEW_KEY,
			label: 'Overview',
			children: <Overview />,
		},
		{
			key: CONFIGURATION_KEY,
			label: 'Model pricing',
			children: <LLMObservabilityModelPricing />,
		},
	];

	return { items, activeTab, onTabChange };
}
