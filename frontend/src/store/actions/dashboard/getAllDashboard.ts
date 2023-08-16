import getAll from 'api/dashboard/getAll';
import { AxiosError } from 'axios';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const GetAllDashboards = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => async (dispatch: Dispatch<AppActions>): Promise<void> => {
	try {
		dispatch({
			type: 'GET_ALL_DASHBOARD_LOADING_START',
		});
		const response = await getAll();

		if (response.statusCode === 200) {
			dispatch({
				type: 'GET_ALL_DASHBOARD_SUCCESS',
				payload: response.payload,
			});
		} else {
			dispatch({
				type: 'GET_ALL_DASHBOARD_ERROR',
				payload: {
					errorMessage: response.error || 'Something went wrong',
				},
			});
		}
	} catch (error) {
		dispatch({
			type: 'GET_ALL_DASHBOARD_ERROR',
			payload: {
				errorMessage: (error as AxiosError).toString() || 'Something went wrong',
			},
		});
	}
};
