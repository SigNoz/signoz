import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_SPANS_AGGREEGATE } from 'types/actions/trace';
import getSpansAggregate from 'api/trace/getSpansAggregate';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';
import isEqual from 'lodash-es/isEqual';
import { parseQueryIntoCurrent, updateURL } from './util';

export const GetInitialSpansAggregate = (
	props: GetInitialSpansAggregateProps,
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return async (dispatch, getState): Promise<void> => {
		const { traces, globalTime } = getState();
		const { spansAggregate } = traces;
		const { query } = props;

		const parsedCurrent = parseQueryIntoCurrent(query);

		// if there is any disparity in data return the action
		if (
			globalTime.maxTime !== props.maxTime ||
			globalTime.minTime !== props.minTime ||
			!isEqual(props.selectedTags, props.selectedTags)
		) {
			return;
		}

		try {
			// triggering loading
			dispatch({
				type: UPDATE_SPANS_AGGREEGATE,
				payload: {
					spansAggregate: {
						currentPage: props.current,
						loading: true,
						data: spansAggregate.data,
						error: false,
						total: spansAggregate.total,
					},
				},
			});

			const response = await getSpansAggregate({
				end: props.maxTime,
				start: props.minTime,
				tags: props.selectedTags,
				limit: 10,
				offset: spansAggregate.currentPage,
			});

			if (response.statusCode === 200) {
				dispatch({
					type: UPDATE_SPANS_AGGREEGATE,
					payload: {
						spansAggregate: {
							currentPage: props.current,
							loading: false,
							data: response.payload.spans,
							error: false,
							total: response.payload.totalSpans,
						},
					},
				});

				updateURL(
					traces.filter,
					traces.selectedFilter,
					traces.filterToFetchData,
					props.current,
				);
			} else {
				dispatch({
					type: UPDATE_SPANS_AGGREEGATE,
					payload: {
						spansAggregate: {
							currentPage: props.current,
							loading: false,
							data: spansAggregate.data,
							error: true,
							total: spansAggregate.total,
						},
					},
				});
			}
		} catch (error) {
			dispatch({
				type: UPDATE_SPANS_AGGREEGATE,
				payload: {
					spansAggregate: {
						currentPage: props.current,
						loading: false,
						data: spansAggregate.data,
						error: true,
						total: spansAggregate.total,
					},
				},
			});
		}
	};
};

export interface GetInitialSpansAggregateProps {
	maxTime: GlobalReducer['maxTime'];
	minTime: GlobalReducer['minTime'];
	selectedTags: TraceReducer['selectedTags'];
	current: number;
	query: string;
}
