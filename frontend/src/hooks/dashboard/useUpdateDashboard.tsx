import update from 'api/v1/dashboards/update';
import dayjs from 'dayjs';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useMutation, UseMutationResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Props } from 'types/api/dashboard/update';
import APIError from 'types/api/error';

export const useUpdateDashboard = (): UseUpdateDashboard => {
	const { updatedTimeRef } = useDashboard();
	return useMutation(update, {
		onSuccess: (data) => {
			if (data.data) {
				updatedTimeRef.current = dayjs(data.data.updatedAt);
			}
		},
	});
};

type UseUpdateDashboard = UseMutationResult<
	SuccessResponseV2<Dashboard>,
	APIError,
	Props,
	unknown
>;
