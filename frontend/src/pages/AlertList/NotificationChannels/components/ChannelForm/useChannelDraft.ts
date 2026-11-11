import { useEffect, useState } from 'react';
import { useGetNotificationChannel } from 'api/generated/services/channels';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { ErrorType } from 'api/generatedAPIInstance';
import {
	ChannelFormState,
	toChannelFormState,
} from 'container/CreateAlertChannels/channelFormValues';
import {
	ChannelInitialConfig,
	DEFAULT_CHANNEL_KIND,
} from 'container/CreateAlertChannels/defaults';
import { ChannelKind } from 'container/CreateAlertChannels/types';
import { toAPIError } from 'utils/errorUtils';

export interface ChannelDraftResult {
	draft: ChannelFormState | null;
	isLoading: boolean;
	loadError: string | null;
}

/**
 * Kept apart from the form so the form is built once its values are known,
 * rather than mounted empty and reset.
 */
export function useChannelDraft(
	channelId?: string,
	initialKind?: ChannelKind,
): ChannelDraftResult {
	const isEditing = !!channelId;

	const { data, error: loadFailure } = useGetNotificationChannel(
		{ id: channelId ?? '' },
		{ query: { enabled: isEditing } },
	);

	const [draft, setDraft] = useState<ChannelFormState | null>(() =>
		channelId
			? null
			: {
					kind: initialKind ?? DEFAULT_CHANNEL_KIND,
					values: {
						sendResolved: true,
						...ChannelInitialConfig[initialKind ?? DEFAULT_CHANNEL_KIND],
					},
				},
	);
	const [unsupportedKind, setUnsupportedKind] = useState<string | null>(null);

	useEffect(() => {
		if (!data?.data) {
			return;
		}

		try {
			const next = toChannelFormState(data.data);
			setDraft((current) => current ?? next);
		} catch (conversionError) {
			setUnsupportedKind((conversionError as Error).message);
		}
	}, [data]);

	return {
		draft,
		isLoading: isEditing && !draft && !loadFailure && !unsupportedKind,
		loadError:
			unsupportedKind ??
			(loadFailure
				? toAPIError(
						loadFailure as ErrorType<RenderErrorResponseDTO>,
					).getErrorMessage()
				: null),
	};
}
