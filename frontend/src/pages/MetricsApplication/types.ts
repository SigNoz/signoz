import { NotificationInstance } from 'antd/es/notification/interface';
import { UseMutateAsyncFunction } from 'react-query';
import {
	SetApDexPayloadProps,
	SetApDexSettingsProps,
} from 'types/api/metrics/getApDex';

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

export interface OnSaveApDexSettingsProps {
	thresholdValue: number;
	servicename: string;
	notifications: NotificationInstance;
	refetchGetApDexSetting: (() => void) | undefined;
	mutateAsync: UseMutateAsyncFunction<
		SetApDexPayloadProps,
		Error,
		SetApDexSettingsProps
	>;
	handlePopOverClose: () => void;
}
