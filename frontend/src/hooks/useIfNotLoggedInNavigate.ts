import { notification } from 'antd';
import history from 'lib/history';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

const useLoggedInNavigate = (navigateTo: string): void => {
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);
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
