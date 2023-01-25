import update from 'api/dashboard/update';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Dashboard } from 'types/api/dashboard/getAll';

export const UpdateDashboardTitleDescriptionTags = ({
	dashboard, // @TODO need to grab the dashboard from the store
}: UpdateDashboardTitleDescriptionTagsProps): ((
	dispatch: Dispatch<AppActions>,
) => void) => async (dispatch: Dispatch<AppActions>): Promise<void> => {
	try {
		const { data } = dashboard;

		const response = await update({
			data: {
				...dashboard.data,
				title: dashboard.data.title,
			},
			uuid: dashboard.uuid,
		});

		if (response.statusCode === 200) {
			dispatch({
				type: 'UPDATE_TITLE_DESCRIPTION_TAGS_SUCCESS',
				payload: {
					description: data.description,
					tags: data.tags,
					title: dashboard.data.title,
				},
			});
			dispatch({
				type: 'TOGGLE_EDIT_MODE',
			});
		} else {
			dispatch({
				type: 'UPDATE_TITLE_DESCRIPTION_TAGS_ERROR',
				payload: {
					errorMessage: response.error || 'Something went wrong',
				},
			});
		}
	} catch (error) {
		dispatch({
			type: 'UPDATE_TITLE_DESCRIPTION_TAGS_ERROR',
			payload: {
				errorMessage:
					error instanceof Error ? error.toString() : 'Something went wrong',
			},
		});
	}
};

export interface UpdateDashboardTitleDescriptionTagsProps {
	dashboard: Dashboard;
}
