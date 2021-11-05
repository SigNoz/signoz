import getService from 'api/metrics/getService';
import { AxiosError } from 'axios';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';

export const GetService = (
	props: GetServiceProps,
): ((dispatch: Dispatch<AppActions>, getState: () => AppState) => void) => {
	return async (dispatch, getState): Promise<void> => {
		try {
			const { globalTime } = getState();

			if (props.selectedTimeInterval !== globalTime.selectedTime) {
				return;
			}

			const { maxTime, minTime } = GetMinMax(props.selectedTimeInterval, [
				globalTime.minTime / 1000000,
				globalTime.maxTime / 1000000,
			]);

			dispatch({
				type: 'GET_SERVICE_LIST_LOADING_START',
			});

			const response = await getService({
				end: maxTime,
				start: minTime,
			});

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

export type GetServiceProps = {
	selectedTimeInterval: GlobalReducer['selectedTime'];
};
