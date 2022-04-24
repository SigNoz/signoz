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
import setTheme, { AppMode } from 'lib/theme/setTheme';
import React, { useCallback, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ToggleDarkMode } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import AppReducer from 'types/reducer/app';

import CurrentOrganiztion from './CurrentOrganization';
import SignedInAS from './SignedInAs';
import {
	Container,
	LogoutContainer,
	MenuContainer,
	ThemeSwitcherWrapper,
	ToggleButton,
} from './styles';

function HeaderContainer({ toggleDarkMode }: Props): JSX.Element {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const [isUserDropDownOpen, setIsUserDropDownOpen] = useState<boolean>();

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

	const onArrowClickHandler: VoidFunction = () => {
		setIsUserDropDownOpen((state) => !state);
	};

	const menu = (
		<MenuContainer>
			<Menu.ItemGroup>
				<SignedInAS />
				<Divider />
				<CurrentOrganiztion />
				<Divider />
				<LogoutContainer>
					<LogoutOutlined />
					<Typography>Logout</Typography>
				</LogoutContainer>
			</Menu.ItemGroup>
		</MenuContainer>
	);

	return (
		<Layout.Header>
			<Container>
				<Space align="end">
					<ThemeSwitcherWrapper>
						<ToggleButton
							checked={isDarkMode}
							onChange={onToggleThemeHandler}
							defaultChecked={isDarkMode}
						/>
					</ThemeSwitcherWrapper>

					<Dropdown
						onVisibleChange={onArrowClickHandler}
						trigger={['click']}
						overlay={menu}
					>
						<Space>
							<Avatar shape="circle">asd</Avatar>
							{!isUserDropDownOpen ? <CaretDownFilled /> : <CaretUpFilled />}
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
