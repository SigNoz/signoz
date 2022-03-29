import { Action, ActionTypes, ServiceMapStore } from 'store/actions';

const initialState: ServiceMapStore = {
	items: [],
	services: [],
};

export const ServiceMapReducer = (
	state = initialState,
	action: Action,
): ServiceMapStore => {
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
