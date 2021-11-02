import getServiceList from 'api/trace/getServiceList';
import getServiceOperation from 'api/trace/getServiceOperation';
import getSpan from 'api/trace/getSpan';
import getSpansAggregate from 'api/trace/getSpanAggregate';
import getTags from 'api/trace/getTags';
import { AxiosError } from 'axios';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import history from 'lib/history';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps as ServiceOperationPayloadProps } from 'types/api/trace/getServiceOperation';
import { PayloadProps as TagPayloadProps } from 'types/api/trace/getTags';
import { TraceReducer } from 'types/reducer/trace';

export const GetInitialTraceData = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const urlParams = new URLSearchParams(history.location.search.split('?')[1]);

			const operationName = urlParams.get(METRICS_PAGE_QUERY_PARAM.operation);
			const serviceName = urlParams.get(METRICS_PAGE_QUERY_PARAM.service);
			const errorTag = urlParams.get(METRICS_PAGE_QUERY_PARAM.error);
			const kindTag = urlParams.get(METRICS_PAGE_QUERY_PARAM.kind);
			const latencyMin = urlParams.get(METRICS_PAGE_QUERY_PARAM.latencyMin);
			const latencyMax = urlParams.get(METRICS_PAGE_QUERY_PARAM.latencyMax);
			const selectedTags = urlParams.get(METRICS_PAGE_QUERY_PARAM.selectedTags);
			const aggregationOption = urlParams.get(
				METRICS_PAGE_QUERY_PARAM.aggregationOption,
			);
			const selectedEntityOption = urlParams.get(METRICS_PAGE_QUERY_PARAM.entity);

			const { globalTime, trace } = store.getState();
			const { minTime, maxTime, selectedTime } = globalTime;
			const { selectedAggOption, selectedEntity } = trace;

			const isCustomSelected = selectedTime === 'custom';

			const [
				serviceListResponse,
				spanResponse,
				spanAggregateResponse,
			] = await Promise.all([
				getServiceList(),
				getSpan({
					start: minTime,
					end: maxTime,
					kind: kindTag || '',
					limit: '100',
					lookback: '2d',
					maxDuration: latencyMax || '',
					minDuration: latencyMin || '',
					operation: operationName || '',
					service: serviceName || '',
					tags: selectedTags || '[]',
				}),
				getSpansAggregate({
					aggregation_option: aggregationOption || selectedAggOption,
					dimension: selectedEntityOption || selectedEntity,
					end: isCustomSelected
						? globalTime.minTime + 15 * 60 * 1000000000
						: maxTime,
					start: isCustomSelected
						? globalTime.minTime - 15 * 60 * 1000000000
						: minTime,

					kind: kindTag || '',
					maxDuration: latencyMax || '',
					minDuration: latencyMin || '',
					operation: operationName || '',
					service: serviceName || '',
					step: '60',
					tags: selectedTags || '[]',
				}),
			]);

			let tagResponse:
				| SuccessResponse<TagPayloadProps>
				| ErrorResponse
				| undefined;

			let serviceOperationResponse:
				| SuccessResponse<ServiceOperationPayloadProps>
				| ErrorResponse
				| undefined;

			if (serviceName !== null && serviceName.length !== 0) {
				[tagResponse, serviceOperationResponse] = await Promise.all([
					getTags({
						service: serviceName,
					}),
					getServiceOperation({
						service: serviceName,
					}),
				]);
			}

			const getSelectedTags = (): TraceReducer['selectedTags'] => {
				const selectedTag = JSON.parse(selectedTags || '[]');

				if (typeof selectedTag !== 'object' && Array.isArray(selectedTag)) {
					return [];
				}

				if (errorTag) {
					return [
						...selectedTag,
						{
							key: METRICS_PAGE_QUERY_PARAM.error,
							operator: 'equals',
							value: errorTag,
						},
					];
				}

				return [...selectedTag];
			};

			const getCondition = (): boolean => {
				const basicCondition =
					serviceListResponse.statusCode === 200 &&
					spanResponse.statusCode === 200 &&
					(spanAggregateResponse.statusCode === 200 ||
						spanAggregateResponse.statusCode === 400);

				if (serviceName === null || serviceName.length === 0) {
					return basicCondition;
				}

				return (
					basicCondition &&
					tagResponse?.statusCode === 200 &&
					serviceOperationResponse?.statusCode === 200
				);
			};

			const condition = getCondition();

			if (condition) {
				dispatch({
					type: 'GET_TRACE_INITIAL_DATA_SUCCESS',
					payload: {
						serviceList: serviceListResponse.payload || [],
						operationList: serviceOperationResponse?.payload || [],
						tagsSuggestions: tagResponse?.payload || [],
						spansList: spanResponse?.payload || [],
						selectedService: serviceName || '',
						selectedOperation: operationName || '',
						selectedTags: getSelectedTags(),
						selectedKind: kindTag || '',
						selectedLatency: {
							max: latencyMax || '',
							min: latencyMin || '',
						},
						spansAggregate: spanAggregateResponse.payload || [],
					},
				});

				dispatch({
					type: 'GET_TRACE_LOADING_END',
				});
			} else {
				dispatch({
					type: 'GET_TRACE_INITIAL_DATA_ERROR',
					payload: {
						errorMessage: serviceListResponse?.error || 'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'GET_TRACE_INITIAL_DATA_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
		}
	};
};
