import { Card as CardComponent } from 'antd';
import RGL, { WidthProvider } from 'react-grid-layout';
import styled from 'styled-components';

const ReactGridLayoutComponent = WidthProvider(RGL);

export const Card = styled(CardComponent)`
	height: 100%;

	.ant-card-body {
		height: 100%;
	}
`;

export const ReactGridLayout = styled(ReactGridLayoutComponent)`
	border: 1px solid #434343;
	margin-top: 1rem;
	position: relative;
`;
