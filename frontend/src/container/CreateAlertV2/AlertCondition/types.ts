import type { DefaultOptionType } from 'antd/es/select';
import { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';

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
	channels: ChannelOption[];
	isLoadingChannels: boolean;
	units: DefaultOptionType[];
	isErrorChannels: boolean;
	refreshChannels: () => void;
}

export interface AnomalyAndThresholdProps {
	channels: ChannelOption[];
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
