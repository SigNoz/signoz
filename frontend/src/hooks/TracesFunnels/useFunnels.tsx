import {
	createFunnel,
	deleteFunnel,
	getFunnelById,
	getFunnelsList,
	renameFunnel,
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

export const useFunnelDetails = (
	funnelId: string,
): UseQueryResult<SuccessResponse<FunnelData> | ErrorResponse, unknown> =>
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
