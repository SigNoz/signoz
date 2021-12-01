import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { UsageReducer } from 'types/reducer/usage';

export const updateSelectedService = ({
	selectedService,
}: UpdateSelectedService): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch): void => {
		dispatch({
			type: 'UPDATE_SELECTED_SERVICE',
			payload: {
				selectedService,
			},
		});
	};
};

export interface UpdateSelectedService {
	selectedService: UsageReducer['selectedService'];
}
