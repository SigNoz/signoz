import { TAB_KEYS_VS_METRICS_APPLICATION_KEY } from './config';
import { MetricsApplicationTab } from './types';

export const isMetricsApplicationTab = (
	tab: string,
): tab is MetricsApplicationTab =>
	Object.values(MetricsApplicationTab).includes(tab as MetricsApplicationTab);

export const getMetricsApplicationKey = (
	tab: string | null,
): MetricsApplicationTab => {
	if (tab && isMetricsApplicationTab(tab)) {
		return TAB_KEYS_VS_METRICS_APPLICATION_KEY[tab];
	}

	return MetricsApplicationTab.OVER_METRICS;
};
