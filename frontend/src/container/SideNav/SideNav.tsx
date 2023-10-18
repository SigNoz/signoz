import { MenuProps } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import useLicense, { LICENSE_PLAN_KEY } from 'hooks/useLicense';
import history from 'lib/history';
import { LifeBuoy } from 'lucide-react';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { sideBarCollapse } from 'store/actions/app';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { isCloudUser } from 'utils/app';

import { routeConfig, styles } from './config';
import { getQueryString } from './helper';
import defaultMenuItems from './menuItems';
import { MenuItem, SecondaryMenuItemKey } from './sideNav.types';
import { getActiveMenuKeyFromPath } from './sideNav.utils';
import { Sider, StyledPrimaryMenu, StyledSecondaryMenu } from './styles';

function SideNav(): JSX.Element {
	const dispatch = useDispatch();
	const [collapsed, setCollapsed] = useState<boolean>(
		getLocalStorageKey(IS_SIDEBAR_COLLAPSED) === 'true',
	);
	const { role, featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const { data } = useLicense();

	const isOnBasicPlan =
		data?.payload?.licenses?.some(
			(license) =>
				license.isCurrent && license.planKey === LICENSE_PLAN_KEY.BASIC_PLAN,
		) || data?.payload?.licenses === null;

	const menuItems = useMemo(
		() =>
			defaultMenuItems.filter((item) => {
				const isOnboardingEnabled =
					featureResponse.data?.find(
						(feature) => feature.name === FeatureKeys.ONBOARDING,
					)?.active || false;

				if (role !== 'ADMIN' || isOnBasicPlan) {
					return item.key !== ROUTES.BILLING;
				}

				if (!isOnboardingEnabled || !isCloudUser()) {
					return item.key !== ROUTES.GET_STARTED;
				}

				return true;
			}),
		[featureResponse.data, isOnBasicPlan, role],
	);

	const { pathname, search } = useLocation();

	const onCollapse = useCallback(() => {
		setCollapsed((collapsed) => !collapsed);
	}, []);

	useLayoutEffect(() => {
		dispatch(sideBarCollapse(collapsed));
	}, [collapsed, dispatch]);

	const onClickHandler = useCallback(
		(key: string) => {
			const params = new URLSearchParams(search);
			const availableParams = routeConfig[key];

			const queryString = getQueryString(availableParams || [], params);

			if (pathname !== key) {
				history.push(`${key}?${queryString.join('&')}`);
			}
		},
		[pathname, search],
	);

	const onClickMenuHandler: MenuProps['onClick'] = (e) => {
		onClickHandler(e.key);
	};

	const secondaryMenuItems: MenuItem[] = [
		{
			key: SecondaryMenuItemKey.Support,
			label: 'Support',
			icon: <LifeBuoy />,
		},
	];

	const activeMenuKey = useMemo(() => getActiveMenuKeyFromPath(pathname), [
		pathname,
	]);

	return (
		<Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={200}>
			<StyledPrimaryMenu
				theme="dark"
				defaultSelectedKeys={[ROUTES.APPLICATION]}
				selectedKeys={activeMenuKey ? [activeMenuKey] : []}
				mode="vertical"
				style={styles}
				items={menuItems}
				onClick={onClickMenuHandler}
			/>
			<StyledSecondaryMenu
				theme="dark"
				selectedKeys={activeMenuKey ? [activeMenuKey] : []}
				mode="vertical"
				style={styles}
				items={secondaryMenuItems}
				onClick={onClickMenuHandler}
			/>
		</Sider>
	);
}

export default SideNav;
