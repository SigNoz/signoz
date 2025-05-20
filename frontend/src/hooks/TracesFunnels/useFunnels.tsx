import { NotificationInstance } from 'antd/es/notification/interface';
import {
	createFunnel,
	deleteFunnel,
	ErrorTraceData,
	ErrorTracesPayload,
	FunnelOverviewPayload,
	FunnelOverviewResponse,
	FunnelStepsResponse,
	getFunnelById,
	getFunnelErrorTraces,
	getFunnelOverview,
	getFunnelsList,
	getFunnelSlowTraces,
	getFunnelSteps,
	renameFunnel,
	RenameFunnelPayload,
	saveFunnelDescription,
	SlowTraceData,
	SlowTracesPayload,
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

export const useFunnelsList = (): UseQueryResult<
	SuccessResponse<FunnelData[]> | ErrorResponse,
	unknown
> =>
	useQuery({
		queryKey: [REACT_QUERY_KEY.GET_FUNNELS_LIST],
		queryFn: () => getFunnelsList(),
		refetchOnWindowFocus: true,
	});

export const useFunnelDetails = ({
	funnelId,
}: {
	funnelId?: string;
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
		staleTime: 1000 * 60 * 5,
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

export function useFunnelStepsGraphData(
	funnelId: string,
): UseQueryResult<SuccessResponse<FunnelStepsResponse> | ErrorResponse, Error> {
	const {
		startTime,
		endTime,
		selectedTime,
		validTracesCount,
	} = useFunnelContext();

	return useQuery({
		queryFn: ({ signal }) =>
			getFunnelSteps(
				funnelId,
				{ start_time: startTime, end_time: endTime },
				signal,
			),
		queryKey: [
			REACT_QUERY_KEY.GET_FUNNEL_STEPS_GRAPH_DATA,
			funnelId,
			selectedTime,
		],
		enabled: !!funnelId && validTracesCount > 0,
	});
}
