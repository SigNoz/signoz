import {
	CaretDownFilled,
	CaretUpFilled,
	LogoutOutlined,
	QuestionCircleOutlined,
} from '@ant-design/icons';
import {
	Avatar,
	Divider,
	Dropdown,
	Layout,
	Menu,
	Space,
	Typography,
} from 'antd';
import getDynamicConfigs from 'api/dynamicConfigs/getDynamicConfigs';
import { Logout } from 'api/utils';
import ROUTES from 'constants/routes';
import setTheme, { AppMode } from 'lib/theme/setTheme';
import React, { useCallback, useState } from 'react';
import { useQuery } from 'react-query';
import { connect, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ToggleDarkMode } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { ConfigProps } from 'types/api/dynamicConfigs/getDynamicConfigs';
import AppReducer from 'types/reducer/app';

import CurrentOrganization from './CurrentOrganization';
import HelpToolTip from './HelpToolTip';
import ManageLicense from './ManageLicense';
import SignedInAS from './SignedInAs';
import { Container, LogoutContainer, ToggleButton } from './styles';

function HeaderContainer({ toggleDarkMode }: Props): JSX.Element {
	const { isDarkMode, user, currentVersion } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);
	let IsHelpToolTip = false;
	let currentConfig: ConfigProps;
	// get configs from dynamicConfigs api
	const response = useQuery('dynamicConfigs', () => getDynamicConfigs());
	const configs = response.data?.payload;
	if (configs) {
		Object.entries(configs).forEach((key) => {
			if (
				key['1'].Enabled &&
				key['1'].FrontendPositionId === 'tooltip' &&
				key['1'].Components.length > 0
			) {
				IsHelpToolTip = true;
				currentConfig = key['1'];
			}
		});
	}

	const [isUserDropDownOpen, setIsUserDropDownOpen] = useState<boolean>();
	const [isHelpDropDownOpen, setIsHelpDropDownOpen] = useState<boolean>();
	const onToggleThemeHandler = useCallback(() => {
		const preMode: AppMode = isDarkMode ? 'lightMode' : 'darkMode';
		setTheme(preMode);

		const id: AppMode = preMode;
		const { head } = document;
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.href = !isDarkMode ? '/css/antd.dark.min.css' : '/css/antd.min.css';
		link.media = 'all';
		link.id = id;
		head.appendChild(link);

		link.onload = (): void => {
			toggleDarkMode();
			const prevNode = document.getElementById('appMode');
			prevNode?.remove();
		};
	}, [toggleDarkMode, isDarkMode]);

	const onHelpArrowClickHandler: VoidFunction = () => {
		setIsHelpDropDownOpen((state) => !state);
	};
	const onArrowClickHandler: VoidFunction = () => {
		setIsUserDropDownOpen((state) => !state);
	};

	const onClickLogoutHandler = (): void => {
		Logout();
	};

	const menu = (
		<Menu style={{ padding: '1rem' }}>
			<Menu.ItemGroup>
				<SignedInAS />
				<Divider />
				<CurrentOrganization onToggle={onArrowClickHandler} />
				<Divider />
				<ManageLicense onToggle={onArrowClickHandler} />
				<Divider />
				<LogoutContainer>
					<LogoutOutlined />
					<div
						tabIndex={0}
						onKeyDown={(e): void => {
							if (e.key === 'Enter' || e.key === 'Space') {
								onClickLogoutHandler();
							}
						}}
						role="button"
						onClick={onClickLogoutHandler}
					>
						<Typography.Link>Logout</Typography.Link>
					</div>
				</LogoutContainer>
			</Menu.ItemGroup>
		</Menu>
	);
	const helpMenu = (
		<Menu style={{ padding: '1rem' }}>
			<HelpToolTip config={currentConfig} />{' '}
		</Menu>
	);
	return (
		<Layout.Header
			style={{
				paddingLeft: '1.125rem',
				paddingRight: '1.125rem',
			}}
		>
			<Container>
				<NavLink
					style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					to={ROUTES.APPLICATION}
				>
					<img src={`/signoz.svg?currentVersion=${currentVersion}`} alt="SigNoz" />
					<Typography.Title style={{ margin: 0, color: '#DBDBDB' }} level={4}>
						SigNoz
					</Typography.Title>
				</NavLink>
				<Space align="center">
					{IsHelpToolTip && (
						<Dropdown
							onVisibleChange={onHelpArrowClickHandler}
							trigger={['click']}
							overlay={helpMenu}
							visible={isHelpDropDownOpen}
						>
							<Space>
								<QuestionCircleOutlined
									style={{ fontSize: '1.50rem', color: '#DBDBDB' }}
								/>
								{!isHelpDropDownOpen ? (
									<CaretDownFilled
										style={{
											color: '#DBDBDB',
										}}
									/>
								) : (
									<CaretUpFilled
										style={{
											color: '#DBDBDB',
										}}
									/>
								)}
							</Space>
						</Dropdown>
					)}
					<ToggleButton
						checked={isDarkMode}
						onChange={onToggleThemeHandler}
						defaultChecked={isDarkMode}
						checkedChildren="🌜"
						unCheckedChildren="🌞"
					/>

					<Dropdown
						onVisibleChange={onArrowClickHandler}
						trigger={['click']}
						overlay={menu}
						visible={isUserDropDownOpen}
					>
						<Space>
							<Avatar shape="circle">{user?.name[0]}</Avatar>
							{!isUserDropDownOpen ? (
								<CaretDownFilled
									style={{
										color: '#DBDBDB',
									}}
								/>
							) : (
								<CaretUpFilled
									style={{
										color: '#DBDBDB',
									}}
								/>
							)}
						</Space>
					</Dropdown>
				</Space>
			</Container>
		</Layout.Header>
	);
}

interface DispatchProps {
	toggleDarkMode: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleDarkMode: bindActionCreators(ToggleDarkMode, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(HeaderContainer);
