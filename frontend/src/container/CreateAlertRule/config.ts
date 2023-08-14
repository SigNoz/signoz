import { AlertTypes } from 'types/api/alerts/alertTypes';
import { DataSource } from 'types/common/queryBuilder';

export const ALERT_TYPE_VS_SOURCE_MAPPING = {
	[DataSource.LOGS]: AlertTypes.LOGS_BASED_ALERT,
	[DataSource.METRICS]: AlertTypes.METRICS_BASED_ALERT,
	[DataSource.TRACES]: AlertTypes.TRACES_BASED_ALERT,
};
