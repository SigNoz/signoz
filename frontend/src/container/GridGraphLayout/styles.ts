import { Button as ButtonComponent, Card as CardComponent } from 'antd';
import RGL, { WidthProvider } from 'react-grid-layout';
import styled from 'styled-components';

const ReactGridLayoutComponent = WidthProvider(RGL);

interface Props {
	isQueryType: boolean;
}
export const Card = styled(CardComponent)<Props>`
	&&& {
		height: 100%;
	}

	.ant-card-body {
		height: 95%;
		padding: 0;
	}
`;

export const CardContainer = styled.div`
	.react-resizable-handle {
		position: absolute;
		width: 20px;
		height: 20px;
		bottom: 0;
		right: 0;
		background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pg08IS0tIEdlbmVyYXRvcjogQWRvYmUgRmlyZXdvcmtzIENTNiwgRXhwb3J0IFNWRyBFeHRlbnNpb24gYnkgQWFyb24gQmVhbGwgKGh0dHA6Ly9maXJld29ya3MuYWJlYWxsLmNvbSkgLiBWZXJzaW9uOiAwLjYuMSAgLS0+DTwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DTxzdmcgaWQ9IlVudGl0bGVkLVBhZ2UlMjAxIiB2aWV3Qm94PSIwIDAgNiA2IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojZmZmZmZmMDAiIHZlcnNpb249IjEuMSINCXhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbDpzcGFjZT0icHJlc2VydmUiDQl4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjZweCIgaGVpZ2h0PSI2cHgiDT4NCTxnIG9wYWNpdHk9IjAuMzAyIj4NCQk8cGF0aCBkPSJNIDYgNiBMIDAgNiBMIDAgNC4yIEwgNCA0LjIgTCA0LjIgNC4yIEwgNC4yIDAgTCA2IDAgTCA2IDYgTCA2IDYgWiIgZmlsbD0iIzAwMDAwMCIvPg0JPC9nPg08L3N2Zz4=');
		background-position: bottom right;
		padding: 0 3px 3px 0;
		background-repeat: no-repeat;
		background-origin: content-box;
		box-sizing: border-box;
		cursor: se-resize;
	}
`;

export const ReactGridLayout = styled(ReactGridLayoutComponent)`
	border: 1px solid #434343;
	margin-top: 1rem;
	position: relative;
`;

export const ButtonContainer = styled.div`
	display: flex;
	justify-content: end;
	margin-top: 1rem;
`;

export const Button = styled(ButtonComponent)`
	&&& {
		display: flex;
		justify-content: center;
		align-items: center;
	}
`;
