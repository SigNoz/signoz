import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';

export const ApplySettingsToPanel = (
	props: ApplySettingsToPanelProps,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: 'APPLY_SETTINGS_TO_PANEL',
		payload: props,
	});
};

export interface ApplySettingsToPanelProps {
	title: Widgets['title'];
	description: Widgets['description'];
	opacity: Widgets['opacity'];
	isStacked: Widgets['isStacked'];
	timePreferance: Widgets['timePreferance'];
	nullZeroValues: Widgets['nullZeroValues'];
	widgetId: Widgets['id'];
	yAxisUnit: Widgets['yAxisUnit'];
}
