import {
	CaretDownFilled,
	CaretUpFilled,
	LogoutOutlined,
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
import { Logout } from 'api/utils';
import ROUTES from 'constants/routes';
import Config from 'container/ConfigDropdown';
import setTheme, { AppMode } from 'lib/theme/setTheme';
import React, { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ToggleDarkMode } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import AppReducer from 'types/reducer/app';

import CurrentOrganization from './CurrentOrganization';
import ManageLicense from './ManageLicense';
import SignedInAS from './SignedInAs';
import {
	Container,
	IconContainer,
	LogoutContainer,
	ToggleButton,
} from './styles';

function HeaderContainer({ toggleDarkMode }: Props): JSX.Element {
	const { isDarkMode, user, currentVersion } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const [isUserDropDownOpen, setIsUserDropDownOpen] = useState<boolean>(false);

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

	const onToggleHandler = useCallback(
		(functionToExecute: Dispatch<SetStateAction<boolean>>) => (): void => {
			functionToExecute((state) => !state);
		},
		[],
	);

	const menu = (
		<Menu style={{ padding: '1rem' }}>
			<Menu.ItemGroup>
				<SignedInAS />
				<Divider />
				<CurrentOrganization onToggle={onToggleHandler(setIsUserDropDownOpen)} />
				<Divider />
				<ManageLicense onToggle={onToggleHandler(setIsUserDropDownOpen)} />
				<Divider />
				<LogoutContainer>
					<LogoutOutlined />
					<div
						tabIndex={0}
						onKeyDown={(e): void => {
							if (e.key === 'Enter' || e.key === 'Space') {
								Logout();
							}
						}}
						role="button"
						onClick={Logout}
					>
						<Typography.Link>Logout</Typography.Link>
					</div>
				</LogoutContainer>
			</Menu.ItemGroup>
		</Menu>
	);

	return (
		<Layout.Header>
			<Container>
				<NavLink to={ROUTES.APPLICATION}>
					<Space align="center" direction="horizontal">
						<img src={`/signoz.svg?currentVersion=${currentVersion}`} alt="SigNoz" />
						<Typography.Title style={{ margin: 0, color: '#DBDBDB' }} level={4}>
							SigNoz
						</Typography.Title>
					</Space>
				</NavLink>

				<Space style={{ height: '100%' }} align="center">
					<Config frontendId="tooltip" />

					<ToggleButton
						checked={isDarkMode}
						onChange={onToggleThemeHandler}
						defaultChecked={isDarkMode}
						checkedChildren="🌜"
						unCheckedChildren="🌞"
					/>

					<Dropdown
						onVisibleChange={onToggleHandler(setIsUserDropDownOpen)}
						trigger={['click']}
						overlay={menu}
						visible={isUserDropDownOpen}
					>
						<Space>
							<Avatar shape="circle">{user?.name[0]}</Avatar>
							<IconContainer>
								{!isUserDropDownOpen ? <CaretDownFilled /> : <CaretUpFilled />}
							</IconContainer>
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
