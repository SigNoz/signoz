import getPublicDashboardAPI from 'api/dashboard/public/getPublicDashboard';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { PublicDashboardProps } from 'types/api/dashboard/public/get';
import APIError from 'types/api/error';

export const useGetPublicDashboard = (
	id: string,
): UseQueryResult<SuccessResponseV2<PublicDashboardProps>, APIError> => {
	const { showErrorModal } = useErrorModal();

	return useQuery<SuccessResponseV2<PublicDashboardProps>, APIError>({
		queryFn: () => getPublicDashboardAPI({ id }),
		onError: (error) => {
			showErrorModal(error);
		},
		queryKey: [REACT_QUERY_KEY.GET_PUBLIC_DASHBOARD, id],
		enabled: !!id,
	});
};
