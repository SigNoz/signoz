import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { SettingTab } from 'types/reducer/app';

export const ToggleSettingsTab = (
	props: SettingTab,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'TOGGLE_SETTINGS_TABS',
			payload: {
				activeTab: props,
			},
		});
	};
};
