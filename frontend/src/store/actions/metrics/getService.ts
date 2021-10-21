import getService from 'api/metrics/getService';
import { AxiosError } from 'axios';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Props } from 'types/api/metrics/getService';

export const GetService = ({
	end,
	start,
}: GetServiceProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			dispatch({
				type: 'GET_SERVICE_LIST_LOADING_START',
			});

			const response = await getService({ end, start });

			if (response.statusCode === 200) {
				dispatch({
					type: 'GET_SERVICE_LIST_SUCCESS',
					payload: response.payload,
				});
			} else {
				dispatch({
					type: 'GET_SERVICE_LIST_ERROR',
					payload: {
						errorMessage: response.error || 'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'GET_SERVICE_LIST_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
		}
	};
};

export type GetServiceProps = Props;
