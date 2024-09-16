import setLocalStorageKey from 'api/browser/localstorage/set';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const sideBarCollapse = (
	collapseState: boolean,
): ((dispatch: Dispatch<AppActions>) => void) => {
	setLocalStorageKey(IS_SIDEBAR_COLLAPSED, `${collapseState}`);
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'SIDEBAR_COLLAPSE',
			payload: collapseState,
		});
		// trigger a resize event so that any component that relies
		// on the window's width to calculate its layout can be recalculated
		// including the dashboard's grid layout
		window.dispatchEvent(new Event('resize'));
	};
};
