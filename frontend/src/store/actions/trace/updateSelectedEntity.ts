import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

export const UpdateSelectedEntity = (
	selectedEntity: TraceReducer['selectedEntity'],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'UPDATE_SELECTED_ENTITY',
			payload: {
				selectedEntity,
			},
		});
	};
};
