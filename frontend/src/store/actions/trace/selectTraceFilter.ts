import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceFilterEnum } from 'types/reducer/trace';
import { updateURL } from './util';
import { SELECT_TRACE_FILTER } from 'types/actions/trace';

export const SelectedTraceFilter = (props: {
	topic: TraceFilterEnum;
	value: string;
}): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return (dispatch, getState): void => {
		const { topic, value } = props;
		const { traces } = getState();

		const filter = traces.selectedFilter;

		const isTopicPresent = filter.get(topic);

		// append the value
		if (!isTopicPresent) {
			filter.set(props.topic, [props.value]);
		} else {
			const isValuePresent =
				isTopicPresent.find((e) => e === props.value) !== undefined;

			// check the value if present then remove the value
			if (isValuePresent) {
				filter.set(
					props.topic,
					isTopicPresent.filter((e) => e !== value),
				);
			} else {
				// if not present add into the array of string
				filter.set(props.topic, [...isTopicPresent, props.value]);
			}
		}

		updateURL(traces.filter, filter,traces.filterToFetchData);

		dispatch({
			type: SELECT_TRACE_FILTER,
			payload: {
				selectedFilter: filter,
			},
		});
	};
};
