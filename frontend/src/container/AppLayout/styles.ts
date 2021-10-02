import { Layout as LayoutComponent } from 'antd';
import styled from 'styled-components';

export const Layout = styled(LayoutComponent)`
	&&& {
		min-height: 100vh;
		display: flex;
	}
`;

export const Content = styled(Layout.Content)`
	&&& {
		margin: 0 1rem;
	}
`;

export const Footer = styled(Layout.Footer)`
	&&& {
		text-align: center;
		font-size: 0.7rem;
	}
`;
