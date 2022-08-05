import { Action, ActionTypes, ServiceMapStore } from 'store/actions';

const initialState: ServiceMapStore = {
	items: [],
	loading: true,
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
		case ActionTypes.serviceMapLoading: {
			return {
				...state,
				loading: action.payload.loading,
			};
		}
		default:
			return state;
	}
};
