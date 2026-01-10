import getPublicDashboardMetaAPI from 'api/dashboard/public/getPublicDashboardMeta';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { PublicDashboardMetaProps } from 'types/api/dashboard/public/getMeta';
import APIError from 'types/api/error';

export const useGetPublicDashboardMeta = (
	id: string,
	enabled: boolean,
): UseQueryResult<SuccessResponseV2<PublicDashboardMetaProps>, APIError> =>
	useQuery<SuccessResponseV2<PublicDashboardMetaProps>, APIError>({
		queryFn: () => getPublicDashboardMetaAPI({ id }),
		onError: (error) => {
			console.error('Error getting public dashboard', error);
		},
		queryKey: [REACT_QUERY_KEY.GET_PUBLIC_DASHBOARD_META, id],
		enabled,
		keepPreviousData: false,
	});
