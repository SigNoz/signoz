import { Layout as LayoutComponent } from 'antd';
import styled from 'styled-components';

export const Layout = styled(LayoutComponent)`
	&&& {
		min-height: 100vh;
		display: flex;
		position: relative;
	}
`;

export const Content = styled(LayoutComponent.Content)`
	&&& {
		margin: 0 1rem;
	}
`;

export const Footer = styled(LayoutComponent.Footer)`
	&&& {
		text-align: center;
		font-size: 0.7rem;
	}
`;
