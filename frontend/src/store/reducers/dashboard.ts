import { DashboardActions, GET_ALL_DASHBOARD } from 'types/actions/dashboard';
import InitialValue from 'types/reducer/dashboards';

const InitialValue: InitialValue = {
	dashboards: [],
};

const dashboard = (
	state = InitialValue,
	action: DashboardActions,
): InitialValue => {
	switch (action.type) {
		case GET_ALL_DASHBOARD: {
			return {
				dashboards: action.payload,
			};
		}
		default:
			return state;
	}
};

export default dashboard;
