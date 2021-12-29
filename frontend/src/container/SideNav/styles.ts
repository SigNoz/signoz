import { Layout, Switch } from 'antd';
import styled from 'styled-components';
const { Sider: SiderComponent } = Layout;

export const ThemeSwitcherWrapper = styled.div`
	display: flex;
	justify-content: center;
	margin-top: 24px;
	margin-bottom: 16px;
`;

export const Logo = styled.img<LogoProps>`
	width: 100px;
	margin: 9% 5% 5% 10%;
	display: ${({ collapsed }): string => (!collapsed ? 'block' : 'none')};
`;

interface LogoProps {
	collapsed: boolean;
}

export const Sider = styled(SiderComponent)`
	.ant-typography {
		color: white;
	}
`;

interface DarkModeProps {
	checked?: boolean;
	defaultChecked?: boolean;
}

export const ToggleButton = styled(Switch)<DarkModeProps>`
	&&& {
		background: ${({ checked }) => checked === false && 'grey'};
	}
`;

