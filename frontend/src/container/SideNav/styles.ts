import { Layout, Menu, Typography } from 'antd';
import styled from 'styled-components';

const { Sider: SiderComponent } = Layout;

export const Sider = styled(SiderComponent)`
	&&& {
		background: var(--bg-ink-300);

		.ant-layout-sider-children {
			display: flex;
			flex-direction: column;
		}

		.ant-layout-sider-trigger {
			background: var(--bg-ink-300);
		}
	}
`;

export const StyledPrimaryMenu = styled(Menu)`
	flex: 1;
	overflow-y: auto;
`;

export const StyledSecondaryMenu = styled(Menu)`
	&&& {
		:not(.ant-menu-inline-collapsed) > .ant-menu-item {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.ant-menu-title-content {
			margin-inline-start: 10px;
			width: 100%;
		}

		&.ant-menu-inline-collapsed .ant-menu-title-content {
			opacity: 0;
		}
	}
`;

export const RedDot = styled.div`
	width: 10px;
	height: 10px;
	background: var(--bg-cherry-500);
	border-radius: 50%;

	margin-left: 0.5rem;
`;

export const MenuLabelContainer = styled.div`
	display: inline-flex;
	align-items: center;
	justify-content: center;

	width: 100%;
`;

export const StyledText = styled(Typography.Text)`
	width: 100%;

	color: var(--l1-foreground);
`;
