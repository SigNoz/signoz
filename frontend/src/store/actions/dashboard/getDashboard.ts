import getDashboard from 'api/dashboard/get';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Props } from 'types/api/dashboard/get';

export const GetDashboard = ({
	uuid,
	widgetId,
	graphType,
}: GetDashboardProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			dispatch({
				type: 'GET_DASHBOARD_LOADING_START',
			});

			const response = await getDashboard({
				uuid,
			});

			if (response.statusCode === 200) {
				dispatch({
					payload: response.payload,
					type: 'GET_DASHBOARD_SUCCESS',
				});

				if (widgetId !== undefined) {
					dispatch({
						type: 'CREATE_DEFAULT_WIDGET',
						payload: {
							description: '',
							id: widgetId,
							isStacked: false,
							nullZeroValues: 'zero',
							opacity: '0',
							panelTypes: graphType || 'TIME_SERIES',
							timePreferance: 'GLOBAL_TIME',
							title: '',
							queryData: {
								data: [],
								error: false,
								errorMessage: '',
								loading: false,
							},
							query: [
								{
									query: '',
									legend: '',
								},
							],
						},
					});
				}
			} else {
				dispatch({
					type: 'GET_DASHBOARD_ERROR',
					payload: {
						errorMessage: response.error || 'Something went wrong',
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'GET_DASHBOARD_ERROR',
				payload: {
					errorMessage: error.toString() || 'Something went wrong',
				},
			});
		}
	};
};

export interface GetDashboardProps {
	uuid: Props['uuid'];
	widgetId?: string;
	graphType?: GRAPH_TYPES;
}
