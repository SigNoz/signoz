import { Menu } from 'antd';
import styled from 'styled-components';

export const MenuDropdown = styled(Menu)`
	&&& {
		.ant-dropdown,
		.ant-dropdown-menu,
		.ant-dropdown-menu-item {
			padding: 0px;
		}
		.ant-menu-item {
			height: 1.75rem;
			display: flex;
			align-items: center;
		}
	}
`;
