import deleteDashboardApi from 'api/dashboard/delete';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Dashboard } from 'types/api/dashboard/getAll';

export const DeleteDashboard = ({
	uuid,
}: DeleteDashboardProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const response = await deleteDashboardApi({
				uuid: uuid,
			});

			if (response.statusCode === 200) {
				dispatch({
					type: 'DELETE_DASHBOARD_SUCCESS',
					payload: {
						uuid: uuid,
					},
				});
			} else {
				dispatch({
					type: 'DELETE_DASHBOARD_ERROR',
					payload: {
						errorMessage: response.error || 'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'DELETE_DASHBOARD_ERROR',
				payload: {
					errorMessage: error.toString() || 'Something went wrong',
				},
			});
		}
	};
};

export interface DeleteDashboardProps {
	uuid: Dashboard['uuid'];
}
