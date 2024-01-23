import { NotificationInstance } from 'antd/es/notification/interface';
import getFiltersApi from 'api/trace/getFilters';
import xor from 'lodash-es/xor';
import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_ALL_FILTERS,
	UPDATE_TRACE_FILTER_LOADING,
	UPDATE_TRACE_GRAPH_LOADING,
} from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { parseQueryIntoSpanKind } from './parseFilter/parseSpanKind';
import {
	isTraceFilterEnum,
	parseAggregateOrderParams,
	parseFilterExclude,
	parseFilterToFetchData,
	parseIsSkippedSelection,
	parseQueryIntoCurrent,
	parseQueryIntoFilter,
	parseQueryIntoOrder,
	parseQueryIntoPageSize,
	parseQueryIntoSelectedTags,
	parseSelectedFilter,
	stripTimestampsFromQuery,
} from './util';

export const GetInitialTraceFilter = (
	minTime: GlobalReducer['minTime'],
	maxTime: GlobalReducer['maxTime'],
	notify: NotificationInstance,
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
	// eslint-disable-next-line sonarjs/cognitive-complexity
) => void) => async (dispatch, getState): Promise<void> => {
	try {
		const query = window.location.search;

		const { traces, globalTime } = getState();

		if (globalTime.maxTime !== maxTime && globalTime.minTime !== minTime) {
			return;
		}

		const getSelectedFilter = parseSelectedFilter(
			query,
			traces.selectedFilter,
			true,
		);

		const getFilterToFetchData = parseFilterToFetchData(
			query,
			traces.filterToFetchData,
		);

		const parsedSpanKind = parseQueryIntoSpanKind(query, traces.spanKind);

		const getUserSelected = parseSelectedFilter(query, traces.userSelectedFilter);

		const getIsFilterExcluded = parseFilterExclude(query, traces.isFilterExclude);

		const parsedQueryCurrent = parseQueryIntoCurrent(
			query,
			traces.spansAggregate.currentPage,
		);

		const parsedQueryOrder = parseQueryIntoOrder(
			query,
			traces.spansAggregate.order,
		);

		const parsedPageSize = parseQueryIntoPageSize(
			query,
			traces.spansAggregate.pageSize,
		);

		const isSelectionSkipped = parseIsSkippedSelection(query);

		const parsedSelectedTags = parseQueryIntoSelectedTags(
			query,
			traces.selectedTags,
		);

		const parsedOrderParams = parseAggregateOrderParams(
			query,
			traces.spansAggregate.orderParam,
		);

		const parsedFilter = parseQueryIntoFilter(query, traces.filter);

		// now filter are not matching we need to fetch the data and make in sync
		dispatch({
			type: UPDATE_TRACE_FILTER_LOADING,
			payload: {
				filterLoading: true,
			},
		});

		const response = await getFiltersApi({
			end: String(maxTime),
			getFilters: getFilterToFetchData.currentValue,
			start: String(minTime),
			other: Object.fromEntries(getSelectedFilter.currentValue),
			isFilterExclude: getIsFilterExcluded.currentValue,
			spanKind: parsedSpanKind.currentValue,
		});

		const preSelectedFilter: Map<TraceFilterEnum, string[]> = new Map(
			getSelectedFilter.currentValue,
		);

		if (response.payload && !isSelectionSkipped.currentValue) {
			/**  this is required as now we have timestamps updated in date time selection component
			 * 	 so for initial filters we need to strip timestamps and check for initial load
			 */
			const diff =
				stripTimestampsFromQuery(query).length === 0
					? traces.filterToFetchData
					: xor(traces.filterToFetchData, getFilterToFetchData.currentValue);

			Object.keys(response.payload).forEach((key) => {
				const value = response.payload[key];
				Object.keys(value)
					// remove maxDuration and minDuration filter from initial selection logic
					.filter((e) => !['maxDuration', 'minDuration'].includes(e))
					.forEach((preKey) => {
						if (isTraceFilterEnum(key) && diff.find((v) => v === key)) {
							// const preValue = preSelectedFilter?.get(key) || [];
							const preValue = getUserSelected.currentValue?.get(key) || [];
							// preSelectedFilter?.set(key, [...new Set([...preValue, preKey])]);
							getUserSelected.currentValue.set(key, [
								...new Set([...preValue, preKey]),
							]);
						}
					});
			});
		}

		if (response.statusCode === 200) {
			const preResponseSelected: TraceReducer['filterResponseSelected'] = new Set();

			const initialFilter = new Map<TraceFilterEnum, Record<string, string>>(
				parsedFilter.currentValue,
			);

			Object.keys(response.payload).forEach((key) => {
				const value = response.payload[key];
				if (isTraceFilterEnum(key)) {
					Object.keys(value).forEach((e) => preResponseSelected.add(e));

					initialFilter.set(key, {
						...initialFilter.get(key),
						...value,
					});
				}
			});

			dispatch({
				type: UPDATE_ALL_FILTERS,
				payload: {
					filter: initialFilter,
					selectedFilter: preSelectedFilter,
					filterToFetchData: getFilterToFetchData.currentValue,
					current: parsedQueryCurrent.currentValue,
					selectedTags: parsedSelectedTags.currentValue,
					userSelected: getUserSelected.currentValue,
					isFilterExclude: getIsFilterExcluded.currentValue,
					order: parsedQueryOrder.currentValue,
					pageSize: parsedPageSize.currentValue,
					orderParam: parsedOrderParams.currentValue,
					spanKind: parsedSpanKind.currentValue,
				},
			});
		} else {
			notify.error({
				message: response.error || 'Something went wrong',
			});
		}

		dispatch({
			type: UPDATE_TRACE_FILTER_LOADING,
			payload: {
				filterLoading: false,
			},
		});
		dispatch({
			type: UPDATE_TRACE_GRAPH_LOADING,
			payload: {
				loading: false,
			},
		});
	} catch (error) {
		console.error(error);
		dispatch({
			type: UPDATE_TRACE_FILTER_LOADING,
			payload: {
				filterLoading: false,
			},
		});
		dispatch({
			type: UPDATE_TRACE_GRAPH_LOADING,
			payload: {
				loading: false,
			},
		});
	}
};
