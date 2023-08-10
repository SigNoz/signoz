import axios from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';

import { TAB_KEYS_VS_METRICS_APPLICATION_KEY } from './config';
import { MetricsApplicationTab, OnSaveApDexSettingsProps } from './types';

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

export const onSaveApDexSettings = ({
	thresholdValue,
	refetchGetApDexSetting,
	mutateAsync,
	notifications,
	handlePopOverClose,
	servicename,
}: OnSaveApDexSettingsProps) => (): void => {
	if (refetchGetApDexSetting) {
		mutateAsync({
			servicename,
			threshold: thresholdValue,
			excludeStatusCode: '',
		})
			.then(() => {
				refetchGetApDexSetting();
			})
			.catch((err) => {
				if (axios.isAxiosError(err)) {
					notifications.error({
						message: err.message,
					});
				} else {
					notifications.error({
						message: SOMETHING_WENT_WRONG,
					});
				}
			})
			.finally(() => {
				handlePopOverClose();
			});
	}
};
