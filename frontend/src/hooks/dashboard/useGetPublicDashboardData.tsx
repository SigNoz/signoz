import getPublicDashboardDataAPI from 'api/dashboard/public/getPublicDashboardData';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { PublicDashboardDataProps } from 'types/api/dashboard/public/get';
import APIError from 'types/api/error';

export const useGetPublicDashboardData = (
	id: string,
): UseQueryResult<SuccessResponseV2<PublicDashboardDataProps>, APIError> =>
	useQuery<SuccessResponseV2<PublicDashboardDataProps>, APIError>({
		queryFn: () => getPublicDashboardDataAPI({ id }),
		onError: (error) => {
			console.error('Error getting public dashboard data', error);
		},
		queryKey: [REACT_QUERY_KEY.GET_PUBLIC_DASHBOARD, id],
		enabled: !!id,
	});
