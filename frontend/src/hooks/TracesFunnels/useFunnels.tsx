import { NotificationInstance } from 'antd/es/notification/interface';
import {
	createFunnel,
	deleteFunnel,
	ErrorTraceData,
	ErrorTracesPayload,
	FunnelOverviewPayload,
	FunnelOverviewResponse,
	getFunnelById,
	getFunnelErrorTraces,
	getFunnelOverview,
	getFunnelsList,
	getFunnelSlowTraces,
	renameFunnel,
	saveFunnelDescription,
	SlowTraceData,
	SlowTracesPayload,
	updateFunnelStepDetails,
	UpdateFunnelStepDetailsPayload,
	updateFunnelSteps,
	UpdateFunnelStepsPayload,
	ValidateFunnelResponse,
	validateFunnelSteps,
} from 'api/traceFunnels';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import {
	useMutation,
	UseMutationResult,
	useQuery,
	UseQueryResult,
} from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CreateFunnelPayload,
	CreateFunnelResponse,
	FunnelData,
} from 'types/api/traceFunnels';

export const useFunnelsList = ({
	searchQuery,
}: {
	searchQuery: string;
}): UseQueryResult<SuccessResponse<FunnelData[]> | ErrorResponse, unknown> =>
	useQuery({
		queryKey: [REACT_QUERY_KEY.GET_FUNNELS_LIST, searchQuery],
		queryFn: () => getFunnelsList({ search: searchQuery }),
	});

export const useFunnelDetails = ({
	funnelId,
}: {
	funnelId: string;
}): UseQueryResult<SuccessResponse<FunnelData> | ErrorResponse, unknown> =>
	useQuery({
		queryKey: [REACT_QUERY_KEY.GET_FUNNEL_DETAILS, funnelId],
		queryFn: () => getFunnelById(funnelId),
		enabled: !!funnelId,
	});

export const useCreateFunnel = (): UseMutationResult<
	SuccessResponse<CreateFunnelResponse> | ErrorResponse,
	Error,
	CreateFunnelPayload
> =>
	useMutation({
		mutationFn: createFunnel,
	});

interface RenameFunnelPayload {
	id: string;
	funnel_name: string;
}

export const useRenameFunnel = (): UseMutationResult<
	SuccessResponse<FunnelData> | ErrorResponse,
	Error,
	RenameFunnelPayload
> =>
	useMutation({
		mutationFn: renameFunnel,
	});

interface DeleteFunnelPayload {
	id: string;
}

export const useDeleteFunnel = (): UseMutationResult<
	SuccessResponse<FunnelData> | ErrorResponse,
	Error,
	DeleteFunnelPayload
> =>
	useMutation({
		mutationFn: deleteFunnel,
	});

export const useUpdateFunnelSteps = (
	funnelId: string,
	notification: NotificationInstance,
): UseMutationResult<
	SuccessResponse<FunnelData> | ErrorResponse,
	Error,
	UpdateFunnelStepsPayload
> =>
	useMutation({
		mutationFn: updateFunnelSteps,
		mutationKey: [REACT_QUERY_KEY.UPDATE_FUNNEL_STEPS, funnelId],

		onError: (error) => {
			notification.error({
				message: 'Failed to update funnel steps',
				description: error.message,
			});
		},
	});

export const useValidateFunnelSteps = ({
	funnelId,
	selectedTime,
	startTime,
	endTime,
}: {
	funnelId: string;
	selectedTime: string;
	startTime: number;
	endTime: number;
}): UseQueryResult<
	SuccessResponse<ValidateFunnelResponse> | ErrorResponse,
	Error
> =>
	useQuery({
		queryFn: ({ signal }) =>
			validateFunnelSteps(
				funnelId,
				{ start_time: startTime, end_time: endTime },
				signal,
			),
		queryKey: [REACT_QUERY_KEY.VALIDATE_FUNNEL_STEPS, funnelId, selectedTime],
		enabled: !!funnelId && !!selectedTime && !!startTime && !!endTime,
	});

export const useUpdateFunnelStepDetails = ({
	stepOrder,
}: {
	stepOrder: number;
}): UseMutationResult<
	SuccessResponse<FunnelData> | ErrorResponse,
	Error,
	UpdateFunnelStepDetailsPayload
> =>
	useMutation({
		mutationFn: (payload) => updateFunnelStepDetails({ payload, stepOrder }),
		mutationKey: [REACT_QUERY_KEY.UPDATE_FUNNEL_STEP_DETAILS, stepOrder],
	});

interface SaveFunnelDescriptionPayload {
	funnel_id: string;
	description: string;
}

export const useSaveFunnelDescription = (): UseMutationResult<
	SuccessResponse<FunnelData> | ErrorResponse,
	Error,
	SaveFunnelDescriptionPayload
> =>
	useMutation({
		mutationFn: saveFunnelDescription,
	});

export const useFunnelOverview = (
	funnelId: string,
	payload: FunnelOverviewPayload,
): UseQueryResult<
	SuccessResponse<FunnelOverviewResponse> | ErrorResponse,
	Error
> => {
	const { selectedTime, validTracesCount } = useFunnelContext();
	return useQuery({
		queryFn: ({ signal }) => getFunnelOverview(funnelId, payload, signal),
		queryKey: [
			REACT_QUERY_KEY.GET_FUNNEL_OVERVIEW,
			funnelId,
			selectedTime,
			payload.step_start ?? '',
			payload.step_end ?? '',
		],
		enabled: !!funnelId && validTracesCount > 0,
	});
};

export const useFunnelSlowTraces = (
	funnelId: string,
	payload: SlowTracesPayload,
): UseQueryResult<SuccessResponse<SlowTraceData> | ErrorResponse, Error> => {
	const { selectedTime, validTracesCount } = useFunnelContext();
	return useQuery<SuccessResponse<SlowTraceData> | ErrorResponse, Error>({
		queryFn: ({ signal }) => getFunnelSlowTraces(funnelId, payload, signal),
		queryKey: [REACT_QUERY_KEY.GET_FUNNEL_SLOW_TRACES, funnelId, selectedTime],
		enabled: !!funnelId && validTracesCount > 0,
	});
};

export const useFunnelErrorTraces = (
	funnelId: string,
	payload: ErrorTracesPayload,
): UseQueryResult<SuccessResponse<ErrorTraceData> | ErrorResponse, Error> => {
	const { selectedTime, validTracesCount } = useFunnelContext();
	return useQuery({
		queryFn: ({ signal }) => getFunnelErrorTraces(funnelId, payload, signal),
		queryKey: [REACT_QUERY_KEY.GET_FUNNEL_ERROR_TRACES, funnelId, selectedTime],
		enabled: !!funnelId && validTracesCount > 0,
	});
};
