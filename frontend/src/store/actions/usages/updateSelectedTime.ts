import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { UsageReducer } from 'types/reducer/usage';

export const updateSelectedTime = ({
	selectedTime,
}: UpdateSelectedTime): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch): void => {
		dispatch({
			type: 'UPDATE_SELECTED_TIME',
			payload: {
				selectedTime,
			},
		});
	};
};

export interface UpdateSelectedTime {
	selectedTime: UsageReducer['selectedTime'];
}
