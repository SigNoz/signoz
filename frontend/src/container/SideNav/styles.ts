import { Layout, Menu, Typography } from 'antd';
import styled from 'styled-components';

const { Sider: SiderComponent } = Layout;

export const Sider = styled(SiderComponent)`
	&&& {
		background: #1f1f1f;

		.ant-layout-sider-children {
			display: flex;
			flex-direction: column;
		}

		.ant-layout-sider-trigger {
			background: #1f1f1f;
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
	background: #d32029;
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

	color: white;
`;
