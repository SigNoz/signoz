import { notification } from 'antd';
import getLocalStorage from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import history from 'lib/history';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const useLoggedInNavigate = (navigateTo: string): void => {
	const isLoggedIn = getLocalStorage(LOCALSTORAGE.IS_LOGGED_IN);
	const { pathname } = useLocation();
	const { t } = useTranslation();

	useEffect(() => {
		if (isLoggedIn && navigateTo !== pathname) {
			notification.success({
				message: t('logged_in', {
					ns: 'common',
				}),
			});

			history.push(navigateTo);
		}
	}, [isLoggedIn, navigateTo, pathname, t]);
};

export default useLoggedInNavigate;
