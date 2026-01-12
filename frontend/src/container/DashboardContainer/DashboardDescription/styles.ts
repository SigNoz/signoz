import { Button as ButtonComponent, Drawer } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	margin-top: 0.5rem;
`;

export const Button = styled(ButtonComponent)`
	&&& {
		display: flex;
		align-items: center;
	}
`;

export const DrawerContainer = styled(Drawer)`
	.ant-drawer-header {
		padding: 16px;
		border: none;
	}

	.ant-drawer-body {
		padding-top: 0;
	}
`;
