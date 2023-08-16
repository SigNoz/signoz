import { NotificationInstance } from 'antd/es/notification/interface';
import update from 'api/dashboard/update';
import { Dispatch } from 'redux';
import store from 'store/index';
import AppActions from 'types/actions';
import { UPDATE_DASHBOARD_VARIABLES } from 'types/actions/dashboard';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

export const UpdateDashboardVariables = (
	variables: Record<string, IDashboardVariable>,
	notify: NotificationInstance,
): ((dispatch: Dispatch<AppActions>) => void) => async (
	dispatch: Dispatch<AppActions>,
): Promise<void> => {
	try {
		dispatch({
			type: UPDATE_DASHBOARD_VARIABLES,
			payload: variables,
		});

		const reduxStoreState = store.getState();
		const [dashboard] = reduxStoreState.dashboards.dashboards;

		const response = await update({
			data: {
				...dashboard.data,
			},
			uuid: dashboard.uuid,
		});

		if (response.statusCode !== 200) {
			notify.error({
				message: response.error,
			});
		}
	} catch (error) {
		console.error(error);
	}
};
