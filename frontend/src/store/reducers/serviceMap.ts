import { Action, ActionTypes, serviceMapStore } from 'store/actions';

const initialState: serviceMapStore = {
	items: [],
	services: [],
};

export const ServiceMapReducer = (state = initialState, action: Action) => {
	switch (action.type) {
		case ActionTypes.getServiceMapItems:
			return {
				...state,
				items: action.payload,
			};
		case ActionTypes.getServices:
			return {
				...state,
				services: action.payload,
			};
		default:
			return state;
	}
};
