import getQueryEndpoint from 'api/metrics/getQueryEndpoint';
import { AxiosError } from 'axios';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import getMicroSeconds from 'lib/getStartAndEndTime/getMicroSeconds';
import retrievePayloadValues from 'lib/retrievePayloadValues';

export const GetExternalCallMetrics = (
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
				getErrorPercentageResponse,
				getCallDurationResponse,
				getAddressedCallRPSResponse,
				getAddressedCallDurationResponse,
			] = await Promise.all([
				getQueryEndpoint({
					query: `max((sum(rate(signoz_external_call_latency_count{service_name="${props.serviceName}", status_code="STATUS_CODE_ERROR"}[1m]) OR rate(signoz_external_call_latency_count{service_name="${props.serviceName}", http_status_code=~"5.."}[1m]) OR vector(0)) by (http_url))*100/sum(rate(signoz_external_call_latency_count{service_name="${props.serviceName}"}[1m])) by (http_url)) < 1000 OR vector(0)`,
					start: start,
					end: end,
					step: step,
				}),
				getQueryEndpoint({
					query: `sum(rate(signoz_external_call_latency_sum{service_name="${props.serviceName}"}[5m]))/sum(rate(signoz_external_call_latency_count{service_name="${props.serviceName}"}[5m]))`,
					start: start,
					end: end,
					step: step,
				}),
				getQueryEndpoint({
					query: `sum(rate(signoz_external_call_latency_count{service_name="${props.serviceName}"}[5m])) by (http_url)`,
					start: start,
					end: end,
					step: step,
				}),
				getQueryEndpoint({
					query: `sum(rate(signoz_external_call_latency_sum{service_name="${props.serviceName}"}[5m])/rate(signoz_external_call_latency_count{service_name="${props.serviceName}"}[5m])) by (http_url)`,
					start: start,
					end: end,
					step: step,
				}),
			]);

			if (
				getErrorPercentageResponse.statusCode === 200 &&
				getCallDurationResponse.statusCode === 200 &&
				getAddressedCallRPSResponse.statusCode === 200 &&
				getAddressedCallDurationResponse.statusCode === 200
			) {
				dispatch({
					type: 'GET_INITIAL_EXTERNAL_CALL_METRICS',
					payload: {
						externalCallEndpoint: retrievePayloadValues(
							getCallDurationResponse.payload,
							startEndTime,
						),
						externalErrorEndpoints: retrievePayloadValues(
							getErrorPercentageResponse.payload,
							startEndTime,
						),
						addressedExternalCallRPSResponse: retrievePayloadValues(
							getAddressedCallRPSResponse.payload,
							startEndTime,
						),
						addressedExternalCallDurationResponse: retrievePayloadValues(
							getAddressedCallDurationResponse.payload,
							startEndTime,
						),
					},
				});
			} else {
				dispatch({
					type: 'GET_INITIAL_APPLICATION_ERROR',
					payload: {
						errorMessage:
							getErrorPercentageResponse.error ||
							getCallDurationResponse.error ||
							getAddressedCallRPSResponse.error ||
							getAddressedCallDurationResponse.error ||
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
