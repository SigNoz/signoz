import { SESSIONSTORAGE } from 'constants/sessionStorage';

type ComponentImport = () => Promise<any>;

export const lazyRetry = (componentImport: ComponentImport): Promise<any> =>
	new Promise((resolve, reject) => {
		const hasRefreshed: boolean = JSON.parse(
			window.sessionStorage.getItem(SESSIONSTORAGE.RETRY_LAZY_REFRESHED) ||
				'false',
		);

		componentImport()
			.then((component: any) => {
				window.sessionStorage.setItem(SESSIONSTORAGE.RETRY_LAZY_REFRESHED, 'false');
				resolve(component);
			})
			.catch((error: Error) => {
				if (!hasRefreshed) {
					window.sessionStorage.setItem(SESSIONSTORAGE.RETRY_LAZY_REFRESHED, 'true');

					window.location.reload();
				}

				reject(error);
			});
	});
