import { useState } from 'react';
import { useQueryClient } from 'react-query';
import {
	invalidateListNotificationChannels,
	useDeleteNotificationChannel,
} from 'api/generated/services/channels';
import { AlertmanagertypesListedNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

export interface ChannelDeleteState {
	channel: AlertmanagertypesListedNotificationChannelDTO | null;
	isDeleting: boolean;
	request: (channel: AlertmanagertypesListedNotificationChannelDTO) => void;
	cancel: () => void;
	confirm: () => void;
}

export function useChannelDelete(onDeleted?: () => void): ChannelDeleteState {
	const [channel, setChannel] =
		useState<AlertmanagertypesListedNotificationChannelDTO | null>(null);
	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();
	const { mutate, isLoading } = useDeleteNotificationChannel();

	const confirm = (): void => {
		if (!channel) {
			return;
		}

		mutate(
			{ pathParams: { id: channel.id } },
			{
				onSuccess: async (): Promise<void> => {
					setChannel(null);
					await invalidateListNotificationChannels(queryClient);
					onDeleted?.();
				},
				onError: (error): void => {
					setChannel(null);
					showErrorModal(error as unknown as APIError);
				},
			},
		);
	};

	return {
		channel,
		isDeleting: isLoading,
		request: setChannel,
		cancel: (): void => setChannel(null),
		confirm,
	};
}
