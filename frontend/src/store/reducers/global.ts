import { getDefaultOption } from 'container/Header/DateTimeSelection/config';
import {
	GLOBAL_TIME_LOADING_START,
	GlobalTimeAction,
	UPDATE_TIME_INTERVAL,
} from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';
import daysjs from 'dayjs';

const intitalState: GlobalReducer = {
	maxTime: daysjs().toDate().getTime(),
	minTime: daysjs().add(15, 'minutes').toDate().getTime(),
	loading: true,
	selectedTime: getDefaultOption(location.pathname),
};

const globalTimeReducer = (
	state = intitalState,
	action: GlobalTimeAction,
): GlobalReducer => {
	switch (action.type) {
		case UPDATE_TIME_INTERVAL: {
			return {
				...state,
				...action.payload,
				loading: false,
			};
		}

		case GLOBAL_TIME_LOADING_START: {
			return {
				...state,
				loading: true,
			};
		}

		default:
			return state;
	}
};

export default globalTimeReducer;
