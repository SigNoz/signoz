import update from 'api/dashboard/update';
import dayjs from 'dayjs';
import useAxiosError from 'hooks/useAxiosError';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Props } from 'types/api/dashboard/update';

export const useUpdateDashboard = (): UseUpdateDashboard => {
	const { updatedTimeRef } = useDashboard();
	const handleError = useAxiosError();
	return useMutation(update, {
		onSuccess: (data) => {
			if (data.payload) {
				updatedTimeRef.current = dayjs(data.payload.updated_at);
			}
		},
		onError: handleError,
	});
};

type UseUpdateDashboard = UseMutationResult<
	SuccessResponse<Dashboard> | ErrorResponse,
	unknown,
	Props,
	unknown
>;
