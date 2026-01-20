import getAll from 'api/v1/dashboards/getAll';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';

export const useGetAllDashboard = (): UseQueryResult<
	SuccessResponseV2<Dashboard[]>,
	APIError
> => {
	const { showErrorModal } = useErrorModal();

	return useQuery<SuccessResponseV2<Dashboard[]>, APIError>({
		queryFn: getAll,
		onError: (error) => {
			showErrorModal(error);
		},
		queryKey: REACT_QUERY_KEY.GET_ALL_DASHBOARDS,
	});
};
