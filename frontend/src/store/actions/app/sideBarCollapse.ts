import setLocalStorageKey from 'api/browser/localstorage/set';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const SideBarCollapse = (
	collapseState: boolean,
): ((dispatch: Dispatch<AppActions>) => void) => {
	setLocalStorageKey(IS_SIDEBAR_COLLAPSED, `${collapseState}`);
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'SIDEBAR_COLLAPSE',
			payload: collapseState,
		});
	};
};
