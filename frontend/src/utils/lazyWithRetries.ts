import getSessionStorageApi from 'api/browser/sessionstorage/get';
import setSessionStorageApi from 'api/browser/sessionstorage/set';
import { SESSIONSTORAGE } from 'constants/sessionStorage';

type ComponentImport = () => Promise<any>;

export const lazyRetry = (componentImport: ComponentImport): Promise<any> =>
	new Promise((resolve, reject) => {
		const hasRefreshed: boolean = JSON.parse(
			getSessionStorageApi(SESSIONSTORAGE.RETRY_LAZY_REFRESHED) || 'false',
		);

		componentImport()
			.then((component: any) => {
				setSessionStorageApi(SESSIONSTORAGE.RETRY_LAZY_REFRESHED, 'false');
				resolve(component);
			})
			.catch((error: Error) => {
				if (!hasRefreshed) {
					setSessionStorageApi(SESSIONSTORAGE.RETRY_LAZY_REFRESHED, 'true');

					window.location.reload();
				}

				reject(error);
			});
	});
