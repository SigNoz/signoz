import { GET_FIELDS, LogsActions, SET_FIELDS } from 'types/actions/logs';
import ILogsReducer from 'types/reducer/logs';

const initialState: ILogsReducer = {
	fields: {
		interesting: [],
		selected: [],
	},
};

export const LogsReducer = (
	state = initialState,
	action: LogsActions,
): ILogsReducer => {
	switch (action.type) {
		case GET_FIELDS:
			return {
				...state,
			};

		case SET_FIELDS: {
			const newFields = action.payload;

			return {
				...state,
				fields: newFields,
			};
		}

		default:
			return state;
	}
};

export default LogsReducer;
