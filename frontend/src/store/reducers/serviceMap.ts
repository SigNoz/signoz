import { ActionTypes, Action, serviceMapStore } from "../actions";

export const ServiceMapReducer = (
	state: serviceMapStore = {
		items: [],
		services: [],
	},
	action: Action,
) => {
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
