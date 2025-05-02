import { AlertTypes } from 'types/api/alerts/alertTypes';
import { DataSource } from 'types/common/queryBuilder';

export const ALERTS_DATA_SOURCE_MAP: Record<AlertTypes, DataSource> = {
	[AlertTypes.ANOMALY_BASED_ALERT]: DataSource.METRICS,
	[AlertTypes.METRICS_BASED_ALERT]: DataSource.METRICS,
	[AlertTypes.LOGS_BASED_ALERT]: DataSource.LOGS,
	[AlertTypes.TRACES_BASED_ALERT]: DataSource.TRACES,
	[AlertTypes.EXCEPTIONS_BASED_ALERT]: DataSource.TRACES,
};
