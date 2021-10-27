import getServiceList from 'api/trace/getServiceList';
import getServiceOperation from 'api/trace/getServiceOperation';
import getSpan from 'api/trace/getSpan';
import getTags from 'api/trace/getTags';
import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import TraceCustomVisualisation from 'container/TraceCustomVisualization';
import TraceFilter from 'container/TraceFilter';
import TraceList from 'container/TraceList';
import { TableDataSourceItem } from 'container/TraceList';
import { State } from 'hooks/useFetch';
import history from 'lib/history';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps as GetServiceListPayloadProps } from 'types/api/trace/getServiceList';
import { PayloadProps as GetServicePayloadProps } from 'types/api/trace/getServiceOperation';
import {
	PayloadProps as GetSpansPayloadProps,
	pushDStree,
} from 'types/api/trace/getSpans';
import { PayloadProps as GetTagsPayloadProps } from 'types/api/trace/getTags';
import { GlobalReducer } from 'types/reducer/globalTime';

const TraceDetail = (): JSX.Element => {
	const { loading, maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const urlParams = new URLSearchParams(history.location.search.split('?')[1]);
	const [latencyFilterValues, setLatencyFilterValues] = useState<LatencyValue>({
		min: '',
		max: '',
	});

	const serviceName = urlParams.get(METRICS_PAGE_QUERY_PARAM.service);

	const [selectedOperation, setSelectedOperation] = useState<string>('');
	const [selectedService, setSelectedService] = useState<string>(
		serviceName || '',
	);
	const [selectedKind, setSelectedKind] = useState<string>('');
	const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);

	const [initialList, setInitialList] = useState<State<InitialRequestPayload>>({
		loading: true,
		error: false,
		payload: {
			serviceList: [],
			spans: {},
			tags: [],
			operations: [],
		},
		errorMessage: '',
		success: false,
	});

	const fetchData = useCallback(async () => {
		try {
			const [serviceListResponse, getSpanResponse] = await Promise.all([
				getServiceList(),
				getSpan({
					start: minTime,
					end: maxTime,
					kind: '',
					limit: '100',
					lookback: '2d',
					maxDuration: latencyFilterValues.max,
					minDuration: latencyFilterValues.min,
					operation: selectedOperation,
					service: selectedService,
					tags: JSON.stringify(selectedTags),
				}),
			]);

			let tagResponse:
				| SuccessResponse<GetTagsPayloadProps>
				| ErrorResponse
				| undefined;

			let serviceOperationResponse:
				| SuccessResponse<GetServicePayloadProps>
				| ErrorResponse
				| undefined;

			if (selectedService.length !== 0) {
				[tagResponse, serviceOperationResponse] = await Promise.all([
					getTags({
						service: selectedService,
					}),
					getServiceOperation({
						service: selectedService,
					}),
				]);
			}

			const getCondition = (): boolean => {
				const basicCondition =
					serviceListResponse.statusCode === 200 &&
					getSpanResponse.statusCode === 200;

				if (serviceName === null) {
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
				setInitialList((state) => ({
					...state,
					payload: {
						serviceList: serviceListResponse.payload || [],
						spans: getSpanResponse.payload || {},
						tags: tagResponse?.payload || [],
						operations: serviceOperationResponse?.payload || [],
					},
					error: false,
					loading: false,
					errorMessage: '',
					success: true,
				}));
			} else {
				setInitialList((state) => ({
					...state,
					payload: {
						serviceList: [],
						spans: {},
						tags: [],
						operations: [],
					},
					error: true,
					loading: false,
					errorMessage:
						serviceListResponse.error ||
						getSpanResponse.error ||
						'Something went wrong',
					success: false,
				}));
			}
		} catch (error) {
			setInitialList((state) => ({
				...state,
				payload: {
					serviceList: [],
					spans: {},
					tags: [],
					operations: [],
				},
				error: true,
				loading: false,
				errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				success: false,
			}));
		}
	}, [
		maxTime,
		minTime,
		serviceName,
		selectedOperation,
		selectedService,
		latencyFilterValues,
		selectedTags,
	]);

	useEffect(() => {
		if (!loading) {
			fetchData();
		}
	}, [fetchData, loading]);

	if (loading || initialList.loading) {
		return <Spinner tip={'Loading...'} height="100vh" />;
	}

	const getSpans = (): TableDataSourceItem[] => {
		if (initialList.payload === undefined) {
			return [];
		}

		const response = initialList.payload.spans[0].events.map(
			(item: (number | string | string[] | pushDStree[])[], index) => {
				if (
					typeof item[0] === 'number' &&
					typeof item[4] === 'string' &&
					typeof item[6] === 'string' &&
					typeof item[1] === 'string' &&
					typeof item[2] === 'string' &&
					typeof item[3] === 'string'
				) {
					return {
						startTime: item[0],
						operationName: item[4],
						duration: parseInt(item[6]),
						spanid: item[1],
						traceid: item[2],
						key: index.toString(),
						service: item[3],
					};
				}
				return {
					duration: 0,
					key: '',
					operationName: '',
					service: '',
					spanid: '',
					startTime: 0,
					traceid: '',
				};
			},
		);

		return response;
	};

	const spans = getSpans();

	return (
		<>
			<TraceFilter
				{...{
					setSelectedKind,
					setSelectedOperation,
					setSelectedService,
					serviceList: initialList.payload.serviceList,
					tags: initialList.payload.tags || [],
					serviceOperation: initialList.payload.operations || [],
					fetchData: fetchData,
					setInitialList: setInitialList,
					latencyFilterValues,
					setLatencyFilterValues,
					selectedOperation: selectedOperation,
					selectedService: selectedService,
					selectedTags,
					setSelectedTags,
				}}
			/>

			<TraceCustomVisualisation
				{...{
					selectedKind,
					selectedOperation,
					selectedService,
					selectedTags,
				}}
			/>

			<TraceList spans={spans} />
		</>
	);
};

export interface InitialRequestPayload {
	serviceList: GetServiceListPayloadProps;
	spans: GetSpansPayloadProps;
	tags?: GetTagsPayloadProps;
	operations?: GetServicePayloadProps;
}

export interface LatencyValue {
	min: string;
	max: string;
}

export interface TagItem {
	key: string;
	value: string;
	operator: 'equals' | 'contains' | 'regex';
}

export default TraceDetail;
