import getAll from 'api/dashboard/getAll';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/dashboard/getAll';

export const useGetAllDashboard = (): DashboardProps =>
	useQuery({
		queryFn: getAll,
		queryKey: REACT_QUERY_KEY.GET_ALL_DASHBOARDS,
	});

type DashboardProps = UseQueryResult<
	SuccessResponse<PayloadProps> | ErrorResponse,
	unknown
>;
