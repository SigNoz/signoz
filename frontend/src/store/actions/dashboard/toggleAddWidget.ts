import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const ToggleAddWidget = (
	props: ToggleAddWidgetProps,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: 'IS_ADD_WIDGET',
		payload: {
			isAddWidget: props,
		},
	});
};

export type ToggleAddWidgetProps = boolean;
