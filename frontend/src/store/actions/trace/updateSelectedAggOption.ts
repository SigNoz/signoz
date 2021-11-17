import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

export const UpdateSelectedAggOption = (
	selectedAggOption: TraceReducer['selectedAggOption'],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'UPDATE_SELECTED_AGG_OPTION',
			payload: {
				selectedAggOption,
			},
		});
	};
};
