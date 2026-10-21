import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import { useForm, UseFormReturn } from 'react-hook-form';
import logEvent from 'api/common/logEvent';
import {
	invalidateGetNotificationChannel,
	invalidateListNotificationChannels,
	useCreateNotificationChannel,
	useTestNotificationChannel,
	useUpdateNotificationChannel,
} from 'api/generated/services/channels';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { ErrorType } from 'api/generatedAPIInstance';
import {
	toPostableChannel,
	toTestableChannel,
	toUpdatableChannel,
} from 'container/CreateAlertChannels/channelConfig';
import { ChannelFormState } from 'container/CreateAlertChannels/channelFormValues';
import {
	ChannelFormValues,
	ChannelKind,
} from 'container/CreateAlertChannels/types';
import { ChannelInitialConfig } from 'container/CreateAlertChannels/defaults';
import { channelResolver } from 'container/CreateAlertChannels/channelResolver';
import { useNotifications } from 'hooks/useNotifications';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { toAPIError } from 'utils/errorUtils';

export interface ChannelFormStateResult {
	form: UseFormReturn<ChannelFormValues>;
	type: ChannelKind;
	/** False until something is edited, which is what gates saving. */
	isDirty: boolean;
	onTypeChange: (value: string) => void;
	onSave: () => void;
	onTest: () => void;
	isSaving: boolean;
	isTesting: boolean;
}

/** Creating has no channel to address; editing always has one. */
export type ChannelFormTarget =
	| { mode: 'create' }
	| { mode: 'edit'; channelId: string };

interface UseChannelFormStateArgs {
	draft: ChannelFormState;
	target: ChannelFormTarget;
	onDone: () => void;
}

export function useChannelFormState({
	draft,
	target,
	onDone,
}: UseChannelFormStateArgs): ChannelFormStateResult {
	const { t } = useTranslation('channels');
	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();
	const queryClient = useQueryClient();

	const isEditing = target.mode === 'edit';

	const [type, setTypeState] = useState<ChannelKind>(draft.kind);

	const form = useForm<ChannelFormValues>({
		defaultValues: draft.values,
		resolver: channelResolver(type, t),
	});

	const { mutateAsync: createChannel, isLoading: isCreating } =
		useCreateNotificationChannel();
	const { mutateAsync: updateChannel, isLoading: isUpdating } =
		useUpdateNotificationChannel();
	const { mutateAsync: testChannel, isLoading: isTesting } =
		useTestNotificationChannel();

	const onTypeChange = useCallback(
		(value: string) => {
			const nextType = value as ChannelKind;
			if (nextType === type) {
				return;
			}

			setTypeState(nextType);

			// shouldDirty, because the type lives outside the form: without it
			// picking a different type leaves the form pristine and unsavable.
			Object.entries(ChannelInitialConfig[nextType]).forEach(([field, value]) => {
				form.setValue(
					field as keyof ChannelFormValues,
					value as ChannelFormValues[keyof ChannelFormValues],
					{ shouldDirty: true },
				);
			});
		},
		[type, form],
	);

	const submitSave = useCallback(
		async (values: ChannelFormValues): Promise<void> => {
			try {
				if (target.mode === 'edit') {
					await updateChannel({
						pathParams: { id: target.channelId },
						data: toUpdatableChannel(type, values),
					});
					await invalidateGetNotificationChannel(queryClient, {
						id: target.channelId,
					});
				} else {
					await createChannel({ data: toPostableChannel(type, values) });
				}

				await invalidateListNotificationChannels(queryClient);
				notifications.success({
					message: 'Success',
					description: isEditing
						? t('channel_edit_done')
						: t('channel_creation_done'),
				});
				void logEvent('Alert Channel: Save channel', {
					type: type,
					sendResolvedAlert: values.sendResolved,
					name: values.name,
					new: isEditing ? 'false' : 'true',
					status: 'success',
				});
				onDone();
			} catch (error) {
				showErrorModal(toAPIError(error as ErrorType<RenderErrorResponseDTO>));
				void logEvent('Alert Channel: Save channel', {
					type: type,
					sendResolvedAlert: values.sendResolved,
					name: values.name,
					new: isEditing ? 'false' : 'true',
					status: 'failed',
				});
			}
		},
		[
			type,
			t,
			notifications,
			isEditing,
			target,
			updateChannel,
			queryClient,
			createChannel,
			onDone,
			showErrorModal,
		],
	);

	const submitTest = useCallback(
		async (values: ChannelFormValues): Promise<void> => {
			try {
				await testChannel({ data: toTestableChannel(type, values) });
				notifications.success({
					message: 'Success',
					description: t('channel_test_done'),
				});
				void logEvent('Alert Channel: Test notification', {
					type: type,
					name: values.name,
					status: 'Test success',
				});
			} catch (error) {
				showErrorModal(toAPIError(error as ErrorType<RenderErrorResponseDTO>));
				void logEvent('Alert Channel: Test notification', {
					type: type,
					name: values.name,
					status: 'Test failed',
				});
			}
		},
		[type, t, notifications, testChannel, showErrorModal],
	);

	return {
		form,
		type,
		isDirty: form.formState.isDirty,
		onTypeChange,
		onSave: form.handleSubmit(submitSave),
		onTest: form.handleSubmit(submitTest),
		isSaving: isCreating || isUpdating,
		isTesting,
	};
}
