import { notification } from 'antd';
import update from 'api/dashboard/update';
import { Dispatch } from 'redux';
import store from 'store/index';
import AppActions from 'types/actions';
import { UPDATE_DASHBOARD_VARIABLES } from 'types/actions/dashboard';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

export const UpdateDashboardVariables = (
	variables: Record<string, IDashboardVariable>,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
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
				notification.error({
					message: response.error,
				});
			}
		} catch (error) {
			console.error(error);
		}
	};
};
