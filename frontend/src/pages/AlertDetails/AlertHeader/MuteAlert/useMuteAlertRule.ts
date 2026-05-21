import { useCallback } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import {
	createDowntimeSchedule,
	getListDowntimeSchedulesQueryKey,
} from 'api/generated/services/downtimeschedules';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type {
	AlertmanagertypesPostablePlannedMaintenanceDTO,
	AlertmanagertypesRecurrenceDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { useNotifications } from 'hooks/useNotifications';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

export type MutePayload = {
	name: string;
	startTime: string;
	endTime?: string | null;
	timezone: string;
	recurrence?: AlertmanagertypesRecurrenceDTO;
};

type UseMuteAlertRuleArgs = {
	ruleId: string;
	onSuccess?: () => void;
};

type UseMuteAlertRuleResult = {
	mute: (payload: MutePayload) => Promise<void>;
	isLoading: boolean;
};

export const useMuteAlertRule = ({
	ruleId,
	onSuccess,
}: UseMuteAlertRuleArgs): UseMuteAlertRuleResult => {
	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();
	const queryClient = useQueryClient();

	const { mutateAsync, isLoading } = useMutation(
		['createMuteDowntime', ruleId],
		(payload: AlertmanagertypesPostablePlannedMaintenanceDTO) =>
			createDowntimeSchedule(payload),
		{
			onSuccess: () => {
				void queryClient.invalidateQueries(getListDowntimeSchedulesQueryKey());
				notifications.success({ message: 'Alert muted' });
				onSuccess?.();
			},
			onError: (error) => {
				showErrorModal(
					convertToApiError(error as AxiosError<RenderErrorResponseDTO>) as APIError,
				);
			},
		},
	);

	const mute = useCallback(
		async (payload: MutePayload): Promise<void> => {
			if (!ruleId) {
				return;
			}
			const body: AlertmanagertypesPostablePlannedMaintenanceDTO = {
				name: payload.name,
				alertIds: [ruleId],
				schedule: {
					startTime: payload.startTime,
					// null = no end ("Forever"). The generated type narrows endTime to
					// string, but the API accepts null to mean indefinite.
					endTime:
						payload.endTime === null ? (null as unknown as string) : payload.endTime,
					timezone: payload.timezone,
					recurrence: payload.recurrence,
				},
			};
			await mutateAsync(body);
		},
		[mutateAsync, ruleId],
	);

	return { mute, isLoading };
};
