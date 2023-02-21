import { Layout as LayoutComponent } from 'antd';
import styled from 'styled-components';

export const Layout = styled(LayoutComponent)`
	&&& {
		display: flex;
		position: relative;
		min-height: calc(100vh - 4rem);
		overflow: hidden;
	}
`;

export const ChildrenContainer = styled.div`
	margin: 0 1rem;
	display: flex;
	flex-direction: column;
	height: 100%;
`;
