import { Button as ButtonComponent, Card as CardComponent } from 'antd';
import { StyledCSS } from 'container/GantChart/Trace/styles';
import RGL, { WidthProvider } from 'react-grid-layout';
import styled, { css } from 'styled-components';

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

interface Props {
	isDarkMode: boolean;
}

export const CardContainer = styled.div<Props>`
	:hover {
		.react-resizable-handle {
			position: absolute;
			width: 20px;
			height: 20px;
			bottom: 0;
			right: 0;
			background-position: bottom right;
			padding: 0 3px 3px 0;
			background-repeat: no-repeat;
			background-origin: content-box;
			box-sizing: border-box;
			cursor: se-resize;

			${({ isDarkMode }): StyledCSS => {
				const uri = `data:image/svg+xml,%3Csvg viewBox='0 0 6 6' style='background-color:%23ffffff00' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' xml:space='preserve' x='0px' y='0px' width='6px' height='6px'%0A%3E%3Cg opacity='0.302'%3E%3Cpath d='M 6 6 L 0 6 L 0 4.2 L 4 4.2 L 4.2 4.2 L 4.2 0 L 6 0 L 6 6 L 6 6 Z' fill='${
					isDarkMode ? 'white' : 'grey'
				}'/%3E%3C/g%3E%3C/svg%3E`;

				return css`
					background-image: ${(): string => `url("${uri}")`};
				`;
			}}
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
