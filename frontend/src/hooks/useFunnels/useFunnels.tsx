import { createFunnel, getFunnelById, getFunnelsList } from 'api/traceFunnels';
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

export const useFunnelsList = (): UseQueryResult<
	SuccessResponse<FunnelData[]> | ErrorResponse,
	unknown
> =>
	useQuery({
		queryKey: [REACT_QUERY_KEY.GET_FUNNELS_LIST],
		queryFn: getFunnelsList,
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
