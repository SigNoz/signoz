import { Layout as LayoutComponent } from 'antd';
import styled from 'styled-components';

export const Layout = styled(LayoutComponent)`
	&&& {
		min-height: 92vh;
		display: flex;
		position: relative;
	}
`;

export const ChildrenContainer = styled.div`
	margin: 0 1rem;
	display: flex;
	flex-direction: column;
	height: 100%;
`;
