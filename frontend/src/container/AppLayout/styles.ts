import { Layout as LayoutComponent } from 'antd';
import styled from 'styled-components';

export const Layout = styled(LayoutComponent)`
	&&& {
		display: flex;
		position: relative;
		min-height: calc(100vh - 8rem);
		overflow: hidden;
		height: 100%;
		flex-direction: column !important;
	}
`;

export const LayoutContent = styled(LayoutComponent.Content)`
	height: 100%;
	&::-webkit-scrollbar {
		width: 0.1rem;
	}
`;

export const ChildrenContainer = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
`;
