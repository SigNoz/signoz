import { useMutation, UseMutationResult } from 'react-query';
import update from 'api/v1/dashboards/id/update';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Props } from 'types/api/dashboard/update';
import APIError from 'types/api/error';

export const useUpdateDashboard = (): UseUpdateDashboard => {
	const { showErrorModal } = useErrorModal();
	return useMutation(update, {
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
