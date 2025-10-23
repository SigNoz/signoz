import getLocalStorageApi from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultTo } from 'lodash-es';

import { IUser } from './types';

function getUserDefaults(): IUser {
	const accessJwt = defaultTo(getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN), '');
	const refreshJwt = defaultTo(
		getLocalStorageApi(LOCALSTORAGE.REFRESH_AUTH_TOKEN),
		'',
	);

	return {
		accessJwt,
		refreshJwt,
		id: '',
		email: '',
		displayName: '',
		createdAt: 0,
		organization: '',
		orgId: '',
		role: 'VIEWER',
	};
}

export { getUserDefaults };
