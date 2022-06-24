import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';

const UNSTAGE_CONFIRM_BOX_SHOW_COUNT = 2;
const UNSTAGE_CONFIRM_BOX_KEY =
	'DASHBOARD_METRICS_BUILDER_UNSTAGE_STASH_CONFIRM_SHOW_COUNT';

export const showUnstagedStashConfirmBox = (): boolean => {
	const showCountTillNow: number = parseInt(
		getLocalStorageApi(UNSTAGE_CONFIRM_BOX_KEY) || '',
		10,
	);
	if (Number.isNaN(showCountTillNow)) {
		setLocalStorageApi(UNSTAGE_CONFIRM_BOX_KEY, '1');
		return true;
	}

	if (showCountTillNow >= UNSTAGE_CONFIRM_BOX_SHOW_COUNT) {
		return false;
	}
	setLocalStorageApi(UNSTAGE_CONFIRM_BOX_KEY, `${showCountTillNow + 1}`);
	return true;
};
