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

// Takes the height left in `.app-content` after the bottom strip.
// `min-height: 0` is not needed right now, overlayscrollbars already sets
// `overflow: auto` here. Kept so this does not break if that goes away.
export const LayoutContent = styled(LayoutComponent.Content)`
	flex: 1;
	min-height: 0;
	&::-webkit-scrollbar {
		width: 0.1rem;
	}
`;

export const ChildrenContainer = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
`;
