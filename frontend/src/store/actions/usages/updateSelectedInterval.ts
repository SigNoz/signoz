import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { UsageReducer } from 'types/reducer/usage';

export const updateSelectedInterval = ({
	selectedInterval,
}: UpdateSelectedInterval): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch): void => {
		dispatch({
			type: 'UPDATE_SELECTED_INTERVAL',
			payload: {
				selectedInterval,
			},
		});
	};
};

export interface UpdateSelectedInterval {
	selectedInterval: UsageReducer['selectedInterval'];
}
