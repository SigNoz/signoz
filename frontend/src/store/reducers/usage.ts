import {
	GET_INITIAL_USAGE_DATA_ERROR,
	GET_INITIAL_USAGE_DATA_LOADING_START,
	GET_INITIAL_USAGE_DATA_SUCCESS,
	UPDATE_SELECTED_INTERVAL,
	UPDATE_SELECTED_SERVICE,
	UPDATE_SELECTED_TIME,
	UsageActions,
} from 'types/actions/usage';
import { Interval, TimeOptions, UsageReducer } from 'types/reducer/usage';

export const timeDaysOptions: TimeOptions[] = [
	{ value: 30, label: 'Last 30 Days' },
	{ value: 7, label: 'Last week' },
	{ value: 1, label: 'Last day' },
];

export const Allinterval: Interval[] = [
	{
		value: 604800,
		chartDivideMultiplier: 1,
		label: 'Weekly',
		applicableOn: [timeDaysOptions[0]],
	},
	{
		value: 86400,
		chartDivideMultiplier: 30,
		label: 'Daily',
		applicableOn: [timeDaysOptions[0], timeDaysOptions[1]],
	},
	{
		value: 3600,
		chartDivideMultiplier: 10,
		label: 'Hours',
		applicableOn: [timeDaysOptions[2], timeDaysOptions[1]],
	},
];

const InitialValue: UsageReducer = {
	error: false,
	errorMessage: '',
	loading: true,
	data: [],
	allService: [],
	selectedService: '',
	selectedTime: timeDaysOptions[0],
	selectedInterval: Allinterval[0],
};

const usage = (state = InitialValue, action: UsageActions): UsageReducer => {
	switch (action.type) {
		case GET_INITIAL_USAGE_DATA_LOADING_START: {
			return { ...state, loading: action.payload.loading };
		}
		case GET_INITIAL_USAGE_DATA_SUCCESS: {
			const { data } = action.payload;

			return {
				...state,
				data,
				allService: action.payload.service,
			};
		}

		case GET_INITIAL_USAGE_DATA_ERROR: {
			return {
				...state,
				error: true,
				errorMessage: action.payload.errorMessage,
			};
		}

		case UPDATE_SELECTED_SERVICE: {
			return {
				...state,
				selectedService: action.payload.selectedService,
			};
		}

		case UPDATE_SELECTED_INTERVAL: {
			return {
				...state,
				selectedInterval: action.payload.selectedInterval,
			};
		}

		case UPDATE_SELECTED_TIME: {
			return {
				...state,
				selectedTime: action.payload.selectedTime,
			};
		}

		default:
			return state;
	}
};

export default usage;
