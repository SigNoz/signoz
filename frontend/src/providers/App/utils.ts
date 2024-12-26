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
	const userId = defaultTo(getLocalStorageApi(LOCALSTORAGE.USER_ID), '');

	return {
		accessJwt,
		refreshJwt,
		id: userId,
		email: '',
		name: '',
		profilePictureURL: '',
		createdAt: 0,
		flags: {},
		organization: '',
		orgId: '',
		role: 'VIEWER',
		groupId: '',
	};
}

export { getUserDefaults };
