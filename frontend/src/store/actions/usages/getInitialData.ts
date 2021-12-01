import getService from 'api/metrics/getService';
import getUsage from 'api/usage/getUsage';
import { AxiosError } from 'axios';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { UsageReducer } from 'types/reducer/usage';

export const GetInitialUsageData = ({
	selectedService,
	step,
	globalSelectedTime,
	selectedTime,
}: GetInitialUsageDataProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const { globalTime } = store.getState();

			//taking redux as source of truth
			if (globalTime.selectedTime !== globalSelectedTime) {
				return;
			}

			const maxTime = new Date().getTime() * 1000000;
			const minTime = maxTime - selectedTime.value * 24 * 3600000 * 1000000;

			const globalMinMax = GetMinMax(globalSelectedTime, [
				globalTime.minTime / 1000000,
				globalTime.maxTime / 1000000,
			]);

			dispatch({
				type: 'GET_INITIAL_USAGE_DATA_LOADING_START',
				payload: {
					loading: true,
				},
			});

			const [getServiceResponse, getUsageResponse] = await Promise.all([
				getService({
					end: globalMinMax.maxTime,
					start: globalMinMax.minTime,
				}),
				getUsage({
					maxTime,
					minTime,
					service: selectedService,
					step,
				}),
			]);

			if (
				getServiceResponse.statusCode === 200 &&
				getUsageResponse.statusCode === 200
			) {
				dispatch({
					type: 'GET_INITIAL_USAGE_DATA_SUCCESS',
					payload: {
						data: getUsageResponse.payload,
						service: getServiceResponse.payload,
					},
				});
			} else {
				dispatch({
					type: 'GET_INITIAL_USAGE_DATA_ERROR',
					payload: {
						errorMessage:
							getUsageResponse.error ||
							getServiceResponse.error ||
							'Something went wrong',
					},
				});
			}
			dispatch({
				type: 'GET_INITIAL_USAGE_DATA_LOADING_START',
				payload: {
					loading: false,
				},
			});
		} catch (error) {
			dispatch({
				type: 'GET_INITIAL_USAGE_DATA_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
			dispatch({
				type: 'GET_INITIAL_USAGE_DATA_LOADING_START',
				payload: {
					loading: false,
				},
			});
		}
	};
};

export interface GetInitialUsageDataProps {
	globalSelectedTime: GlobalReducer['selectedTime'];
	selectedService: UsageReducer['selectedService'];
	step: number;
	selectedTime: UsageReducer['selectedTime'];
}
