import { Layout as LayoutComponent } from 'antd';
import styled from 'styled-components';

export const Layout = styled(LayoutComponent)`
	&&& {
		display: flex;
		position: relative;
		min-height: calc(100vh - 8rem);
		overflow: hidden;
		height: 100%;
	}
`;

export const LayoutContent = styled(LayoutComponent.Content)`
	overflow-y: auto;
`;

export const ChildrenContainer = styled.div`
	margin: 0 1rem;
	display: flex;
	flex-direction: column;
	height: 100%;
`;
