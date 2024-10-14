import { TFunction } from 'i18next';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { OptionType } from './types';

export const getOptionList = (
	t: TFunction,
	isAnomalyDetectionEnabled: boolean,
): OptionType[] => {
	const optionList: OptionType[] = [
		{
			title: t('metric_based_alert'),
			selection: AlertTypes.METRICS_BASED_ALERT,
			description: t('metric_based_alert_desc'),
		},
		{
			title: t('log_based_alert'),
			selection: AlertTypes.LOGS_BASED_ALERT,
			description: t('log_based_alert_desc'),
		},
		{
			title: t('traces_based_alert'),
			selection: AlertTypes.TRACES_BASED_ALERT,
			description: t('traces_based_alert_desc'),
		},
		{
			title: t('exceptions_based_alert'),
			selection: AlertTypes.EXCEPTIONS_BASED_ALERT,
			description: t('exceptions_based_alert_desc'),
		},
	];

	if (isAnomalyDetectionEnabled) {
		optionList.unshift({
			title: t('anomaly_based_alert'),
			selection: AlertTypes.ANOMALY_BASED_ALERT,
			description: t('anomaly_based_alert_desc'),
			isBeta: true,
		});
	}

	return optionList;
};
