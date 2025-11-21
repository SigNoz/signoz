import { DefaultOptionType } from 'antd/es/select';
import { Channels } from 'types/api/channels/getAll';

import {
	NotificationSettingsAction,
	NotificationSettingsState,
	Threshold,
} from '../context/types';

export type UpdateThreshold = {
	(thresholdId: string, field: 'channels', value: string[]): void;
	(
		thresholdId: string,
		field: Exclude<keyof Threshold, 'channels'>,
		value: string | number | null,
	): void;
};

export interface ThresholdItemProps {
	threshold: Threshold;
	updateThreshold: UpdateThreshold;
	removeThreshold: (thresholdId: string) => void;
	showRemoveButton: boolean;
	channels: Channels[];
	isLoadingChannels: boolean;
	units: DefaultOptionType[];
	isErrorChannels: boolean;
	refreshChannels: () => void;
}

export interface AnomalyAndThresholdProps {
	channels: Channels[];
	isLoadingChannels: boolean;
	isErrorChannels: boolean;
	refreshChannels: () => void;
}

export interface RoutingPolicyBannerProps {
	notificationSettings: NotificationSettingsState;
	setNotificationSettings: (
		notificationSettings: NotificationSettingsAction,
	) => void;
}
