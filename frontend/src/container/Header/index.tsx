import {
	CaretDownFilled,
	CaretUpFilled,
	LogoutOutlined,
} from '@ant-design/icons';
import { Divider, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import { Logout } from 'api/utils';
import ROUTES from 'constants/routes';
import Config from 'container/ConfigDropdown';
import { useIsDarkMode, useThemeMode } from 'hooks/useDarkMode';
import React, { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import CurrentOrganization from './CurrentOrganization';
import ManageLicense from './ManageLicense';
import SignedInAS from './SignedInAs';
import {
	AvatarWrapper,
	Container,
	IconContainer,
	LogoutContainer,
	NavLinkWrapper,
	ToggleButton,
} from './styles';

function HeaderContainer(): JSX.Element {
	const { user, currentVersion } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);
	const isDarkMode = useIsDarkMode();
	const { toggleTheme } = useThemeMode();

	const [isUserDropDownOpen, setIsUserDropDownOpen] = useState<boolean>(false);

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
					<NavLinkWrapper>
						<img src={`/signoz.svg?currentVersion=${currentVersion}`} alt="SigNoz" />
						<Typography.Title
							style={{ margin: 0, color: 'rgb(219, 219, 219)' }}
							level={4}
						>
							SigNoz
						</Typography.Title>
					</NavLinkWrapper>
				</NavLink>

				<Space style={{ height: '100%' }} align="center">
					<Config frontendId="tooltip" />

					<ToggleButton
						checked={isDarkMode}
						onChange={toggleTheme}
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
							<AvatarWrapper shape="circle">{user?.name[0]}</AvatarWrapper>
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

export default HeaderContainer;
