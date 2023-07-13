export enum MetricsApplicationTab {
	OVER_METRICS = 'OVER_METRICS',
	DB_CALL_METRICS = 'DB_CALL_METRICS',
	EXTERNAL_METRICS = 'EXTERNAL_METRICS',
}

export const TAB_KEY_VS_LABEL = {
	[MetricsApplicationTab.OVER_METRICS]: 'Overview',
	[MetricsApplicationTab.DB_CALL_METRICS]: 'DB Call Metrics',
	[MetricsApplicationTab.EXTERNAL_METRICS]: 'External Metrics',
};
