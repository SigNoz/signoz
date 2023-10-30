import deleteDashboard from 'api/dashboard/delete';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMutation, UseMutationResult } from 'react-query';
import { PayloadProps } from 'types/api/dashboard/delete';

export const useDeleteDashboard = (
	id: string,
): UseMutationResult<PayloadProps, unknown, void, unknown> =>
	useMutation({
		mutationKey: REACT_QUERY_KEY.DELETE_DASHBOARD,
		mutationFn: () =>
			deleteDashboard({
				uuid: id,
			}),
	});
