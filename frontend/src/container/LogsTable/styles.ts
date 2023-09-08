import { Card } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	overflow-x: hidden;
	width: 100%;
	margin-bottom: 1rem;
	margin-top: 0.5rem;
	display: flex;
	flex-direction: column;
	flex: 1;
`;

export const Heading = styled(Card)`
	margin-bottom: 0.1rem;
	height: 32px;
	.ant-card-body {
		padding: 0.3rem 0.5rem;
	}
`;
