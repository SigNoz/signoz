import { DefaultOptionType } from 'antd/es/select';
import { Channels } from 'types/api/channels/getAll';

import { Threshold } from '../context/types';

export type UpdateThreshold = {
	(thresholdId: string, field: 'channels', value: string[]): void;
	(
		thresholdId: string,
		field: Exclude<keyof Threshold, 'channels'>,
		value: string,
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
}
