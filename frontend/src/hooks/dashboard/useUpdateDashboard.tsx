import update from 'api/dashboard/update';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Props } from 'types/api/dashboard/update';

export const useUpdateDashboard = (): UseUpdateDashboard => useMutation(update);

type UseUpdateDashboard = UseMutationResult<
	SuccessResponse<Dashboard> | ErrorResponse,
	unknown,
	Props,
	unknown
>;
