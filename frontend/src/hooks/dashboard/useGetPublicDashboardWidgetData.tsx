import getPublicDashboardWidgetData from 'api/dashboard/public/getPublicDashboardWidgetData';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { PublicDashboardWidgetDataProps } from 'types/api/dashboard/public/getWidgetData';
import APIError from 'types/api/error';

export const useGetPublicDashboardWidgetData = (
	id: string,
	index: number,
	startTime: number,
	endTime: number,
): UseQueryResult<
	SuccessResponseV2<PublicDashboardWidgetDataProps>,
	APIError
> =>
	useQuery<SuccessResponseV2<PublicDashboardWidgetDataProps>, APIError>({
		queryFn: () =>
			getPublicDashboardWidgetData({ id, index, startTime, endTime }),
		onError: (error) => {
			console.error('Error getting public dashboard data', error);
		},
		queryKey: [REACT_QUERY_KEY.GET_PUBLIC_DASHBOARD_WIDGET_DATA, id, index],
		enabled: !!id,
	});
