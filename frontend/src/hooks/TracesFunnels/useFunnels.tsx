import { NotificationInstance } from 'antd/es/notification/interface';
import {
	createFunnel,
	deleteFunnel,
	getFunnelById,
	getFunnelsList,
	renameFunnel,
	updateFunnelSteps,
	UpdateFunnelStepsPayload,
	ValidateFunnelPayload,
	ValidateFunnelResponse,
	validateFunnelSteps,
} from 'api/traceFunnels';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
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

export const useValidateFunnelSteps = (
	funnelId: string,
): UseMutationResult<
	SuccessResponse<ValidateFunnelResponse> | ErrorResponse,
	Error,
	ValidateFunnelPayload
> =>
	useMutation({
		mutationFn: (payload) => validateFunnelSteps(funnelId, payload),
		mutationKey: [REACT_QUERY_KEY.VALIDATE_FUNNEL_STEPS, funnelId],
	});
