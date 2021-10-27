import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { TraceFilters } from 'types/actions/trace';

export const UpdateTraceFilter = (
	props: UpdateTraceFilterProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		const {
			kind = '',
			tags = [],
			service = '',
			operation = '',
			latency = {
				max: '',
				min: '',
			},
		} = props;

		dispatch({
			type: 'UPDATE_TRACE_FILTER',
			payload: {
				kind,
				latency,
				operation,
				service,
				tags,
			},
		});
	};
};

type UpdateTraceFilterProps = TraceFilters;
