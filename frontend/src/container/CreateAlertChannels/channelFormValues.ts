import { AlertmanagertypesGettableNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';

import { ChannelFormValues, ChannelKind } from './types';
import { webhookAuthOf } from './utils';

export interface ChannelFormState {
	kind: ChannelKind;
	values: ChannelFormValues;
}

/** Each union member types `kind` as its own enum, so a plain cast is unsafe. */
function toChannelKind(kind: string): ChannelKind {
	const known = (Object.values(ChannelKind) as string[]).includes(kind);

	if (!known) {
		throw new Error(`This build cannot render a channel of kind "${kind}".`);
	}

	return kind as ChannelKind;
}

/** The form edits the spec the API returns, so loading lifts it whole. */
export function toChannelFormState(
	channel: AlertmanagertypesGettableNotificationChannelDTO,
): ChannelFormState {
	const kind = toChannelKind(channel.config.kind);
	const values: ChannelFormValues = {
		...channel.config.spec,
		name: channel.displayName,
	};

	if (kind === ChannelKind.webhook) {
		values.webhookAuth = webhookAuthOf(values);
	}

	return { kind, values };
}
