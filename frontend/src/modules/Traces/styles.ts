import { Card as CardComponent, Typography } from 'antd';
import styled from 'styled-components';

export const CustomGraphContainer = styled.div`
	min-height: 30vh;
`;

export const Card = styled(CardComponent)`
	.ant-card-body {
		padding-bottom: 0;
	}
`;

export const CustomVisualizationsTitle = styled(Typography)`
	margin-bottom: 1rem;
`;
