import getServiceOverview from 'api/metrics/getServiceOverview';
import getQueryEndpoint from 'api/metrics/getQueryEndpoint';
import getTopEndPoints from 'api/metrics/getTopEndPoints';
import { AxiosError } from 'axios';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import getMicroSeconds from 'lib/getStartAndEndTime/getMicroSeconds';
import GetPayloadData from 'lib/getPayloadData';

export const GetApplicationData = (
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

			const [
				getServiceOverviewResponse,
				getTopEndPointsResponse,
				getRPSEndpointResponse,
				getErrorPercentageResponse,
			] = await Promise.all([
				getServiceOverview({
					end: maxTime,
					service: props.serviceName,
					start: minTime,
					step,
				}),
				getTopEndPoints({
					end: maxTime,
					service: props.serviceName,
					start: minTime,
				}),
				getQueryEndpoint({
					query: `sum(rate(signoz_latency_count{service_name="${props.serviceName}", span_kind="SPAN_KIND_SERVER"}[2m]))`,
					start: start,
					end: end,
					step: step,
				}),
				getQueryEndpoint({
					query: `max(sum(rate(signoz_calls_total{service_name="${props.serviceName}", span_kind="SPAN_KIND_SERVER", status_code="STATUS_CODE_ERROR"}[1m]) OR rate(signoz_calls_total{service_name="${props.serviceName}", span_kind="SPAN_KIND_SERVER", http_status_code=~"5.."}[1m]))*100/sum(rate(signoz_calls_total{service_name="${props.serviceName}", span_kind="SPAN_KIND_SERVER"}[1m]))) < 1000 OR vector(0)`,
					start: start,
					end: end,
					step: step,
				}),
			]);

			if (
				getServiceOverviewResponse.statusCode === 200 &&
				getTopEndPointsResponse.statusCode === 200 &&
				getRPSEndpointResponse.statusCode === 200 &&
				getErrorPercentageResponse.statusCode === 200
			) {
				dispatch({
					type: 'GET_INITIAL_APPLICATION_METRICS',
					payload: {
						serviceOverview: getServiceOverviewResponse.payload,
						topEndPoints: getTopEndPointsResponse.payload,
						applicationRpsEndpoints: GetPayloadData(
							getRPSEndpointResponse.payload,
							startEndTime,
						),
						applicationErrorEndpoints: GetPayloadData(
							getErrorPercentageResponse.payload,
							startEndTime,
						),
					},
				});
			} else {
				dispatch({
					type: 'GET_INITIAL_APPLICATION_ERROR',
					payload: {
						errorMessage:
							getTopEndPointsResponse.error ||
							getServiceOverviewResponse.error ||
							getRPSEndpointResponse.error ||
							getErrorPercentageResponse.error ||
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
