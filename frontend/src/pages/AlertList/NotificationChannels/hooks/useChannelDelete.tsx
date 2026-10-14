import { useQueryClient } from 'react-query';
import { Typography } from '@signozhq/ui/typography';
import {
	invalidateListNotificationChannels,
	useDeleteNotificationChannel,
} from 'api/generated/services/channels';
import { AlertmanagertypesListedNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';
import { useDeleteConfirm } from 'components/DeleteConfirmModal/useDeleteConfirm';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { ReactNode } from 'react';
import APIError from 'types/api/error';

export interface ChannelDeleteState {
	/** Must be rendered by the caller for the confirmation to appear. */
	contextHolder: ReactNode;
	request: (channel: AlertmanagertypesListedNotificationChannelDTO) => void;
}

/**
 * Deleting a channel goes through the shared destructive confirmation, the same
 * one dashboards and saved views use, so the wording and the danger button match.
 */
export function useChannelDelete(onDeleted?: () => void): ChannelDeleteState {
	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();
	const { contextHolder, confirmDelete } = useDeleteConfirm();
	const { mutateAsync } = useDeleteNotificationChannel();

	const request = (
		channel: AlertmanagertypesListedNotificationChannelDTO,
	): void => {
		confirmDelete({
			title: (
				<Typography.Title level={5}>
					Are you sure you want to delete the {channel.displayName} channel?
				</Typography.Title>
			),
			// Alert rules and routing policies reference a channel by name, so a
			// delete can silence them.
			content:
				'Alert rules and routing policies that notify this channel will stop reaching it.',
			// Returning the promise keeps Delete loading until the request settles.
			onConfirm: async (): Promise<void> => {
				try {
					await mutateAsync({ pathParams: { id: channel.id } });
					await invalidateListNotificationChannels(queryClient);
					onDeleted?.();
				} catch (error) {
					showErrorModal(error as APIError);
				}
			},
		});
	};

	return { contextHolder, request };
}
