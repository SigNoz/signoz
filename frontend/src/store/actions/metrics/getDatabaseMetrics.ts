import getQueryEndpoint from 'api/metrics/getQueryEndpoint';
import { AxiosError } from 'axios';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import GetPayloadData from 'lib/getPayloadData';
import getMicroSeconds from 'lib/getStartAndEndTime/getMicroSeconds';

export const GetDatabaseMetrics = (
	props: GetInitialDataProps,
): ((dispatch: Dispatch<AppActions>, getState: () => AppState) => void) => {
	return async (dispatch, getState): Promise<void> => {
		try {
			const { globalTime } = getState();

			if (
				props.maxTime !== globalTime.maxTime &&
				props.minTime !== globalTime.minTime
			) {
				return;
			}

			dispatch({
				type: 'GET_INITIAL_APPLICATION_LOADING',
			});

			const { maxTime, minTime } = GetMinMax(globalTime.selectedTime, [
				globalTime.minTime / 1000000,
				globalTime.maxTime / 1000000,
			]);

			const start = getMicroSeconds({ time: minTime / 1000000 });
			const end = getMicroSeconds({ time: maxTime / 1000000 });
			const startEndTime = { start: start, end: end };
			const step = 60;

			const [getRPSEndpointResponse, getAvgDurationResponse] = await Promise.all([
				getQueryEndpoint({
					query: `sum(rate(signoz_db_latency_count{service_name="${props.serviceName}"}[1m])) by (db_system)`,
					start: start,
					end: end,
					step: step,
				}),
				getQueryEndpoint({
					query: `sum(rate(signoz_db_latency_sum{service_name="${props.serviceName}"}[5m]))/sum(rate(signoz_db_latency_count{service_name="${props.serviceName}"}[5m]))`,
					start: start,
					end: end,
					step: step,
				}),
			]);

			if (
				getRPSEndpointResponse.statusCode === 200 &&
				getAvgDurationResponse.statusCode === 200
			) {
				dispatch({
					type: 'GET_INITIAL_DATABASE_METRICS',
					payload: {
						dbRpsEndpoints: GetPayloadData(
							getRPSEndpointResponse.payload,
							startEndTime,
						),
						dbAvgDurationEndpoints: GetPayloadData(
							getAvgDurationResponse.payload,
							startEndTime,
						),
					},
				});
			} else {
				dispatch({
					type: 'GET_INITIAL_APPLICATION_ERROR',
					payload: {
						errorMessage:
							getRPSEndpointResponse.error ||
							getAvgDurationResponse.error ||
							'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'GET_INITIAL_APPLICATION_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
		}
	};
};

export interface GetInitialDataProps {
	serviceName: string;
	maxTime: GlobalReducer['maxTime'];
	minTime: GlobalReducer['minTime'];
}
