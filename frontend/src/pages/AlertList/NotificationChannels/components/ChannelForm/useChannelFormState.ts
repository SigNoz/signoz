import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import { Form, FormInstance } from 'antd';
import logEvent from 'api/common/logEvent';
import {
	invalidateGetNotificationChannel,
	invalidateListNotificationChannels,
	useCreateNotificationChannel,
	useGetNotificationChannel,
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
import {
	ChannelFormState,
	toChannelFormState,
} from 'container/CreateAlertChannels/channelFormValues';
import {
	ChannelFormValues,
	ChannelKind,
} from 'container/CreateAlertChannels/types';
import { ChannelInitialConfig } from 'container/CreateAlertChannels/defaults';
import { validateChannel } from 'container/CreateAlertChannels/validation';
import { useNotifications } from 'hooks/useNotifications';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { toAPIError } from 'utils/errorUtils';

export interface ChannelFormStateResult {
	formInstance: FormInstance;
	type: ChannelKind;
	values: ChannelFormValues;
	setValues: React.Dispatch<React.SetStateAction<ChannelFormValues>>;
	onTypeChange: (value: string) => void;
	onSave: (type: ChannelKind) => Promise<void>;
	onTest: (type: ChannelKind) => Promise<void>;
	isSaving: boolean;
	isTesting: boolean;
	isLoading: boolean;
	/** A channel the v2 API cannot model, or one that no longer exists. */
	loadError: string | null;
}

interface UseChannelFormStateArgs {
	channelId?: string;
	onDone: () => void;
}

export function useChannelFormState({
	channelId,
	onDone,
}: UseChannelFormStateArgs): ChannelFormStateResult {
	const { t } = useTranslation('channels');
	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();
	const queryClient = useQueryClient();
	const [formInstance] = Form.useForm();

	const isEditing = !!channelId;

	const { data, error: loadFailure } = useGetNotificationChannel(
		{ id: channelId ?? '' },
		{ query: { enabled: isEditing } },
	);

	/**
	 * antd reads `initialValues` once, when the Form mounts, so the loaded channel
	 * has to be in state before the form renders. Creating starts from the
	 * defaults; editing stays null until the fetch lands and the caller holds the
	 * form back.
	 */
	const [draft, setDraft] = useState<ChannelFormState | null>(() =>
		channelId
			? null
			: {
					kind: ChannelKind.slack,
					values: {
						sendResolved: true,
						...ChannelInitialConfig[ChannelKind.slack],
					},
				},
	);

	useEffect(() => {
		if (data?.data) {
			setDraft((current) => current ?? toChannelFormState(data.data));
		}
	}, [data]);

	const type = draft?.kind ?? ChannelKind.slack;
	const values = useMemo(() => draft?.values ?? {}, [draft]);

	const setType = useCallback((next: ChannelKind): void => {
		setDraft((current) => (current ? { ...current, kind: next } : current));
	}, []);

	const setValues: Dispatch<SetStateAction<ChannelFormValues>> = useCallback(
		(update) => {
			setDraft((current) => {
				if (!current) {
					return current;
				}
				const next = typeof update === 'function' ? update(current.values) : update;
				return { ...current, values: next };
			});
		},
		[],
	);

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

			setType(nextType);

			// the fields the types share (title, text, description) keep the value of
			// the type that was selected before, so the new type's defaults have to be
			// written to both the config and the form
			const defaults = ChannelInitialConfig[nextType];
			setValues((current) => ({ ...current, ...defaults }));
			formInstance.setFieldsValue(defaults);
		},
		[type, formInstance, setType, setValues],
	);

	const onSave = useCallback(
		async (channelType: ChannelKind): Promise<void> => {
			const validationError = validateChannel(channelType, values, t);
			if (validationError) {
				notifications.error({ message: 'Error', description: validationError });
				return;
			}

			try {
				if (isEditing) {
					await updateChannel({
						pathParams: { id: channelId as string },
						data: toUpdatableChannel(channelType, values),
					});
					await invalidateGetNotificationChannel(queryClient, {
						id: channelId as string,
					});
				} else {
					await createChannel({ data: toPostableChannel(channelType, values) });
				}

				await invalidateListNotificationChannels(queryClient);
				notifications.success({
					message: 'Success',
					description: isEditing
						? t('channel_edit_done')
						: t('channel_creation_done'),
				});
				void logEvent('Alert Channel: Save channel', {
					type: channelType,
					sendResolvedAlert: values.sendResolved,
					name: values.name,
					new: isEditing ? 'false' : 'true',
					status: 'success',
				});
				onDone();
			} catch (error) {
				showErrorModal(toAPIError(error as ErrorType<RenderErrorResponseDTO>));
				void logEvent('Alert Channel: Save channel', {
					type: channelType,
					sendResolvedAlert: values.sendResolved,
					name: values.name,
					new: isEditing ? 'false' : 'true',
					status: 'failed',
				});
			}
		},
		[
			values,
			t,
			notifications,
			isEditing,
			updateChannel,
			channelId,
			queryClient,
			createChannel,
			onDone,
			showErrorModal,
		],
	);

	const onTest = useCallback(
		async (channelType: ChannelKind): Promise<void> => {
			const validationError = validateChannel(channelType, values, t);
			if (validationError) {
				notifications.error({ message: 'Error', description: validationError });
				return;
			}

			try {
				await testChannel({ data: toTestableChannel(channelType, values) });
				notifications.success({
					message: 'Success',
					description: t('channel_test_done'),
				});
				void logEvent('Alert Channel: Test notification', {
					type: channelType,
					name: values.name,
					status: 'Test success',
				});
			} catch (error) {
				showErrorModal(toAPIError(error as ErrorType<RenderErrorResponseDTO>));
				void logEvent('Alert Channel: Test notification', {
					type: channelType,
					name: values.name,
					status: 'Test failed',
				});
			}
		},
		[values, t, notifications, testChannel, showErrorModal],
	);

	return {
		formInstance,
		type,
		values,
		setValues,
		onTypeChange,
		onSave,
		onTest,
		isSaving: isCreating || isUpdating,
		isTesting,
		// A failed fetch never produces a draft, so the spinner has to yield to the
		// error rather than wait for one.
		isLoading: isEditing && !draft && !loadFailure,
		loadError: loadFailure
			? toAPIError(
					loadFailure as ErrorType<RenderErrorResponseDTO>,
				).getErrorMessage()
			: null,
	};
}
