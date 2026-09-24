import { AlertmanagertypesGettableNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';

import { ChannelFormValues, ChannelKind } from './types';

export interface ChannelFormState {
	kind: ChannelKind;
	values: ChannelFormValues;
}

/**
 * The form edits the spec the API returns, so loading a channel lifts its
 * display name alongside that spec rather than remapping field by field.
 */
export function toChannelFormState(
	channel: AlertmanagertypesGettableNotificationChannelDTO,
): ChannelFormState {
	return {
		kind: channel.config.kind as string as ChannelKind,
		values: {
			...channel.config.spec,
			// the API keeps `name` immutable and exposes the editable label separately
			name: channel.displayName,
		},
	};
}
