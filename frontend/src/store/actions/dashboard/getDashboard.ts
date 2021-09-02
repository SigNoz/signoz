import getDashboard from 'api/dashboard/get';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Props } from 'types/api/dashboard/get';

export const GetDashboard = ({
	uuid,
}: Props): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			dispatch({
				type: 'GET_DASHBOARD_LOADING_START',
			});

			const response = await getDashboard({
				uuid: uuid,
			});

			if (response.statusCode === 200) {
				dispatch({
					payload: response.payload,
					type: 'GET_DASHBOARD_SUCCESS',
				});
			} else {
				dispatch({
					type: 'GET_DASHBOARD_ERROR',
					payload: {
						errorMessage: response.error || 'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'GET_DASHBOARD_ERROR',
				payload: {
					errorMessage: error.toString() || 'Something went wrong',
				},
			});
		}
	};
};
