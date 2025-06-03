import deleteDashboard from 'api/v1/dashboards/id/delete';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useMutation, UseMutationResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';

export const useDeleteDashboard = (
	id: string,
): UseMutationResult<SuccessResponseV2<null>, APIError, void, unknown> => {
	const { showErrorModal } = useErrorModal();

	return useMutation<SuccessResponseV2<null>, APIError>({
		mutationKey: REACT_QUERY_KEY.DELETE_DASHBOARD,
		mutationFn: () =>
			deleteDashboard({
				id,
			}),
		onError: (error: APIError) => {
			showErrorModal(error);
		},
	});
};
