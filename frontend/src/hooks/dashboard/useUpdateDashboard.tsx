import update from 'api/v1/dashboards/id/update';
import dayjs from 'dayjs';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useMutation, UseMutationResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Props } from 'types/api/dashboard/update';
import APIError from 'types/api/error';

export const useUpdateDashboard = (): UseUpdateDashboard => {
	const { updatedTimeRef } = useDashboard();
	const { showErrorModal } = useErrorModal();
	return useMutation(update, {
		onSuccess: (data) => {
			if (data.data) {
				updatedTimeRef.current = dayjs(data.data.updatedAt);
			}
		},
		onError: (error) => {
			showErrorModal(error);
		},
	});
};

type UseUpdateDashboard = UseMutationResult<
	SuccessResponseV2<Dashboard>,
	APIError,
	Props,
	unknown
>;
