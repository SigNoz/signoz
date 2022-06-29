import { CheckCircleTwoTone, WarningOutlined } from '@ant-design/icons';
import { Menu, Space, Typography } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { SideBarCollapse } from 'store/actions/app';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import menus from './menuItems';
import Slack from './Slack';
import {
	RedDot,
	Sider,
	SlackButton,
	SlackMenuItemContainer,
	Tags,
	VersionContainer,
} from './styles';

function SideNav(): JSX.Element {
	const dispatch = useDispatch();
	const [collapsed, setCollapsed] = useState<boolean>(
		getLocalStorageKey(IS_SIDEBAR_COLLAPSED) === 'true',
	);
	const { currentVersion, latestVersion, isCurrentVersionError } = useSelector<
		AppState,
		AppReducer
	>((state) => state.app);

	const { pathname } = useLocation();
	const { t } = useTranslation('');

	const onCollapse = useCallback(() => {
		setCollapsed((collapsed) => !collapsed);
	}, []);

	useLayoutEffect(() => {
		dispatch(SideBarCollapse(collapsed));
	}, [collapsed, dispatch]);

	const onClickHandler = useCallback(
		(to: string) => {
			if (pathname !== to) {
				history.push(to);
			}
		},
		[pathname],
	);

	const onClickSlackHandler = (): void => {
		window.open('https://signoz.io/slack', '_blank');
	};

	const onClickVersionHandler = (): void => {
		history.push(ROUTES.VERSION);
	};

	const isNotCurrentVersion = currentVersion !== latestVersion;

	const sidebar = [
		{
			onClick: onClickSlackHandler,
			icon: <Slack />,
			text: <SlackButton>Support</SlackButton>,
		},
		{
			onClick: onClickVersionHandler,
			icon: isNotCurrentVersion ? (
				<WarningOutlined style={{ color: '#E87040' }} />
			) : (
				<CheckCircleTwoTone twoToneColor={['#D5F2BB', '#1f1f1f']} />
			),
			text: (
				<VersionContainer>
					{!isCurrentVersionError ? (
						<SlackButton>{currentVersion}</SlackButton>
					) : (
						<SlackButton>{t('n_a')}</SlackButton>
					)}
					{isNotCurrentVersion && <RedDot />}
				</VersionContainer>
			),
		},
	];

	return (
		<Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={200}>
			<Menu
				theme="dark"
				defaultSelectedKeys={[ROUTES.APPLICATION]}
				selectedKeys={[pathname]}
				mode="inline"
			>
				{menus.map(({ to, Icon, name, tags }) => (
					<Menu.Item
						key={to}
						icon={<Icon />}
						onClick={(): void => onClickHandler(to)}
					>
						<Space>
							<div>{name}</div>
							{tags &&
								tags.map((e) => (
									<Tags style={{ lineHeight: '1rem' }} color="#177DDC" key={e}>
										<Typography.Text style={{ fontWeight: '300' }}>{e}</Typography.Text>
									</Tags>
								))}
						</Space>
					</Menu.Item>
				))}
				{sidebar.map((props, index) => (
					<SlackMenuItemContainer
						index={index + 1}
						key={`${index + 1}`}
						collapsed={collapsed}
					>
						<Menu.Item
							eventKey={index.toString()}
							onClick={props.onClick}
							icon={props.icon}
						>
							{props.text}
						</Menu.Item>
					</SlackMenuItemContainer>
				))}
			</Menu>
		</Sider>
	);
}

export default SideNav;
