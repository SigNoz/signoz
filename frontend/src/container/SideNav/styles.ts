import { Layout, Switch, Typography } from 'antd';
import { StyledCSS } from 'container/GantChart/Trace/styles';
import styled, { css } from 'styled-components';

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
	index: number;
}

export const Sider = styled(SiderComponent)`
	z-index: 999;
	.ant-typography {
		color: white;
	}
	.ant-layout-sider-trigger {
		background-color: #1f1f1f;
	}
`;

interface DarkModeProps {
	checked?: boolean;
	defaultChecked?: boolean;
}

export const ToggleButton = styled(Switch)<DarkModeProps>`
	&&& {
		background: ${({ checked }): string => (checked === false ? 'grey' : '')};
	}
`;

export const SlackButton = styled(Typography)`
	&&& {
		margin-left: 1rem;
	}
`;

export const SlackMenuItemContainer = styled.div<LogoProps>`
	position: fixed;
	bottom: ${({ index }): string => `${index * 48 + (index + 16)}px`};
	background: #262626;
	width: ${({ collapsed }): string => (!collapsed ? '200px' : '80px')};
	transition: inherit;

	&&& {
		li {
			${({ collapsed }): StyledCSS =>
				collapsed &&
				css`
					padding-left: 24px;
					padding-top: 6px;
				`}
		}

		svg {
			margin-left: ${({ collapsed }): string => (collapsed ? '0' : '24px')};
			width: 28px;
			height: 28px;

			${({ collapsed }): StyledCSS =>
				collapsed &&
				css`
					height: 100%;
					margin: 0 auto;
				`}
		}
		.ant-menu-title-content {
			margin: 0;
		}
	}
`;

export const RedDot = styled.div`
	width: 12px;
	height: 12px;
	background: #d32029;
	border-radius: 50%;

	margin-left: 1rem;
	margin-top: 0.5rem;
`;

export const VersionContainer = styled.div`
	&&& {
		display: flex;
	}
`;
